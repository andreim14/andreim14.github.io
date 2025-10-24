---
layout: post
title: "Using Redis as a Geo-Spatial Cache: Building a Restaurant Finder with Beanis"
date: 2025-10-30 10:00:00
description: "Learn how to use Redis/Beanis as a lightning-fast cache layer for geo-spatial queries, with PostgreSQL as your source of truth and OpenStreetMap as your data source"
tags: python redis geospatial cache beanis tutorial architecture
categories: tutorials
giscus_comments: true
related_posts: false
thumbnail: assets/img/geo-search.png
keywords: Redis cache, geospatial queries, Python Redis, cache architecture, location search, Redis GeoPoint, Beanis, cache layer, PostgreSQL Redis cache
author: Andrei Stefan Bejgu
---

Food delivery apps need to find nearby restaurants in **milliseconds**, not seconds. But they also need reliable, persistent data. The solution? A **cache architecture**.

In this tutorial, I'll show you how to use **Redis with Beanis as a geo-spatial cache layer** - taking response times from 500-1000ms (PostgreSQL) down to 50-200ms (Redis), while keeping PostgreSQL as your source of truth.

---

## The Architecture

```
┌─────────────┐
│ OpenStreetMap API │  ← Data source (fetch once)
└─────────────┘
        ↓
┌─────────────────┐
│   PostgreSQL    │  ← Source of truth (persistent, ACID)
│   (PostGIS)     │     Response time: 500-1000ms
└─────────────────┘
        ↓
┌─────────────────┐
│  Redis Cache    │  ← Speed layer (volatile, fast)
│    (Beanis)     │     Response time: 50-200ms
└─────────────────┘
        ↓
┌─────────────────┐
│   User Request   │  ← Gets cached data 99% of the time
└─────────────────┘
```

**Why this setup?**

- **OpenStreetMap**: Free real-world data, but slow (500ms-2s) and rate-limited
- **PostgreSQL + PostGIS**: Persistent storage, complex queries, full-text search (500-1000ms)
- **Redis + Beanis**: Fast cache for hot queries (50-200ms), reduces database load

**Key insight:** Redis isn't your database - it's your **cache layer**. Postgres is the source of truth.

---

## The Problem We're Solving

You're building a food delivery app. Your PostgreSQL database has 50,000 restaurants with PostGIS geo-spatial indexes. A typical "find nearby" query looks like this:

```sql
SELECT * FROM restaurants
WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(12.4922, 41.8902), 4326),
    2000  -- 2km radius
)
AND cuisine = 'italian'
AND rating >= 4.5
ORDER BY location <-> ST_SetSRID(ST_MakePoint(12.4922, 41.8902), 4326)
LIMIT 20;
```

**Response time: 60-80ms** (not bad, but not great for real-time apps)

With 10,000 concurrent users, that's 10,000 queries/second hitting your database. You need a cache.

---

## Step 1: The Redis Cache Model

Here's our Beanis model for caching restaurant data ([full code](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/models/cache.py)):

```python
from beanis import Document, Indexed, GeoPoint
from beanis.odm.indexes import IndexedField
from typing_extensions import Annotated
from typing import Optional
from datetime import datetime
from pydantic import Field

class RestaurantCache(Document):
    """
    Redis cache model - mirrors PostgreSQL data for fast queries

    Features:
    - GeoPoint for ultra-fast geo-spatial queries (Redis GEORADIUS)
    - Indexed fields create sorted sets for filtering
    - Cache metadata tracks freshness
    """

    # Source tracking
    db_id: Indexed(int)  # PostgreSQL ID reference (indexed for lookups)
    osm_id: str  # OpenStreetMap ID

    # Core data
    name: str
    location: Annotated[GeoPoint, IndexedField()]  # ⭐ Automatically creates Redis geo-spatial index
    address: Optional[str] = ""
    city: Indexed(str)  # Creates sorted set for city filtering

    # Searchable attributes (indexed for fast filtering)
    cuisine: Indexed(str)  # italian, japanese, etc.
    price_range: Indexed(int)  # 1-4 ($-$$$$)
    rating: Indexed(float)  # 0-5 stars

    # Features
    accepts_delivery: bool = True
    outdoor_seating: bool = False
    takeaway: bool = False
    wheelchair_accessible: bool = False
    opening_hours: dict = {}

    # Contact
    phone: Optional[str] = None
    website: Optional[str] = None

    # Cache metadata
    is_active: Indexed(bool) = True
    cached_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "RestaurantCache"

    @property
    def cache_age_seconds(self) -> float:
        """Calculate how old this cache entry is"""
        return (datetime.now() - self.cached_at).total_seconds()

    def is_stale(self, max_age_seconds: int = 3600) -> bool:
        """
        Check if cache entry should be refreshed

        Args:
            max_age_seconds: Maximum age in seconds (default: 1 hour)

        Returns:
            True if entry is older than max_age
        """
        return self.cache_age_seconds > max_age_seconds
```

**Key features:**
- `location: Annotated[GeoPoint, IndexedField()]` → Beanis automatically creates Redis `GEOADD` index
- `Indexed` fields → Create sorted sets for fast filtering
- `cached_at` → Track cache freshness
- `db_id` → Link back to PostgreSQL source

> 📄 [View full cache model code](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/models/cache.py)

---

## Step 2: Cache Warming

Assuming you already have PostgreSQL with restaurants loaded from OpenStreetMap, let's warm up the Redis cache:

```python
from sqlalchemy.orm import Session
from sqlalchemy import func
import redis.asyncio as redis
from beanis import init_beanis

async def warm_cache_from_postgres(db: Session, city: str = "Rome"):
    """
    Load all active restaurants from PostgreSQL into Redis cache
    Run this on startup or when cache is invalidated
    """

    # Initialize Redis/Beanis
    redis_client = redis.Redis(decode_responses=True)
    await init_beanis(
        database=redis_client,
        document_models=[RestaurantCache]
    )

    print(f"🔥 Warming Redis cache for {city}...")

    # Fetch from PostgreSQL (assuming you have a Restaurant ORM model)
    from models import Restaurant as RestaurantDB

    restaurants = db.query(RestaurantDB).filter_by(
        city=city,
        is_active=True
    ).all()

    cached_count = 0
    for db_restaurant in restaurants:
        # Extract lat/lon from PostGIS geography column
        lat, lon = db.query(
            func.ST_Y(RestaurantDB.location),
            func.ST_X(RestaurantDB.location)
        ).filter_by(id=db_restaurant.id).first()

        # Create cache entry
        cache_entry = RestaurantCache(
            db_id=db_restaurant.id,
            osm_id=db_restaurant.osm_id,
            name=db_restaurant.name,
            location=GeoPoint(lat=lat, lon=lon),
            address=db_restaurant.address or "",
            city=db_restaurant.city,
            cuisine=db_restaurant.cuisine,
            price_range=db_restaurant.price_range,
            rating=db_restaurant.rating,
            accepts_delivery=db_restaurant.accepts_delivery,
            outdoor_seating=db_restaurant.outdoor_seating,
            opening_hours=db_restaurant.opening_hours or {},
        )

        await cache_entry.insert()
        cached_count += 1

    print(f"✅ Cached {cached_count} restaurants in Redis")
    return cached_count

# Example usage:
# from database import SessionLocal
# db = SessionLocal()
# await warm_cache_from_postgres(db, city="Rome")
# Output: ✅ Cached 4,823 restaurants in Redis
```

**What happens behind the scenes:**
1. Beanis creates Redis hash: `RestaurantCache:1` → `{name: "La Carbonara", cuisine: "italian", ...}`
2. Beanis creates geo-index: `GEOADD RestaurantCache:geo 12.4829 41.8933 "1"`
3. Beanis creates sorted sets: `RestaurantCache:idx:cuisine:italian` → `{1, 2, 5, ...}`

---

## Step 3: The Cache Service

Now the magic - querying with intelligent cache fallback ([full code](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/services/restaurant_service.py)):

```python
from typing import List, Optional
from datetime import datetime
from beanis.odm.indexes import IndexManager
from beanis import GeoPoint

class RestaurantService:
    """
    Manages restaurant queries with cache-first strategy

    Flow:
    1. Try Redis cache (50-200ms)
    2. On cache miss → Query PostgreSQL (500-1000ms)
    3. Cache the result for next time
    4. Return results
    """

    def __init__(self, db_session: Session):
        self.db = db_session

    async def find_nearby(
        self,
        lat: float,
        lon: float,
        radius_km: float = 2.0,
        cuisine: Optional[str] = None,
        min_rating: float = 0.0,
        max_price: int = 4,
        use_cache: bool = True
    ) -> List[tuple[RestaurantCache, float]]:
        """
        Find restaurants near a location with intelligent caching

        Returns:
            List of (RestaurantCache, distance_km) tuples
        """

        user_location = GeoPoint(latitude=lat, longitude=lon)

        # === TRY CACHE FIRST ===
        if use_cache:
            cache_start = datetime.now()

            # Query Redis via Beanis geo-spatial index
            redis_client = await get_redis_client()

            results_with_distance = await IndexManager.find_by_geo_radius_with_distance(
                redis_client=redis_client,
                document_class=RestaurantCache,
                field_name="location",
                longitude=lon,
                latitude=lat,
                radius=radius_km,
                unit="km"
            )

            # Get full documents and apply filters
            results = []
            for doc_id, distance in results_with_distance:
                try:
                    doc = await RestaurantCache.get(doc_id)
                    if not doc:
                        continue

                    # Apply filters
                    if cuisine and doc.cuisine != cuisine.lower():
                        continue
                    if doc.rating < min_rating:
                        continue
                    if doc.price_range > max_price:
                        continue
                    if not doc.is_active:
                        continue

                    # Store as (document, distance) tuple
                    results.append((doc, distance))
                except Exception as e:
                    # Skip invalid cached documents
                    logger.warning(f"Skipping invalid cached document {doc_id}: {e}")
                    continue

            cache_time_ms = (datetime.now() - cache_start).total_seconds() * 1000

            if results:
                logger.info(
                    f"⚡ Redis cache HIT: {len(results)} results in {cache_time_ms:.1f}ms"
                )
                return results
            else:
                logger.info(
                    f"💨 Redis cache MISS (took {cache_time_ms:.1f}ms, falling back to PostgreSQL)"
                )

        # === CACHE MISS - QUERY POSTGRESQL ===
        db_start = datetime.now()

        point = ST_SetSRID(ST_MakePoint(lon, lat), 4326)

        # Build PostgreSQL query with PostGIS
        query = self.db.query(RestaurantDB).filter(
            ST_DWithin(
                RestaurantDB.location,
                point,
                radius_km * 1000  # meters
            ),
            RestaurantDB.is_active == True,
            RestaurantDB.rating >= min_rating,
            RestaurantDB.price_range <= max_price
        )

        if cuisine:
            query = query.filter(RestaurantDB.cuisine == cuisine.lower())

        db_results = query.all()

        db_time_ms = (datetime.now() - db_start).total_seconds() * 1000
        logger.info(
            f"💾 PostgreSQL: {len(db_results)} results in {db_time_ms:.1f}ms"
        )

        # Cache these results for next time
        if use_cache and db_results:
            logger.info("📝 Caching results in Redis...")
            await self._cache_results(db_results)

        # Convert to cache format with distances for consistent API
        return await self._db_to_cache_format(db_results, user_lat=lat, user_lon=lon)
```

**Key features:**
- `IndexManager.find_by_geo_radius_with_distance()` → Uses Redis GEORADIUS for geo-spatial queries
- Cache-first strategy with automatic fallback to PostgreSQL
- Results are cached for subsequent queries
- Consistent response format whether from cache or database

> 📄 [View full service code](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/services/restaurant_service.py)

---

## Step 4: FastAPI Integration

Let's expose this as an API ([full code](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/main.py)):

```python
from fastapi import FastAPI, Query, Depends
from sqlalchemy.orm import Session
from database import get_db, init_redis_cache

app = FastAPI(
    title="Restaurant Finder API",
    description="Find nearby restaurants using Redis cache + PostgreSQL"
)

@app.on_event("startup")
async def startup_event():
    """Initialize Redis cache on startup"""
    await init_redis_cache()

@app.get("/restaurants/nearby")
async def find_nearby_restaurants(
    lat: float = Query(..., description="Your latitude", ge=-90, le=90),
    lon: float = Query(..., description="Your longitude", ge=-180, le=180),
    radius: float = Query(2.0, description="Search radius in km", gt=0, le=50),
    cuisine: Optional[str] = Query(None, description="Filter by cuisine type"),
    min_rating: float = Query(0, description="Minimum rating", ge=0, le=5),
    max_price: int = Query(4, description="Maximum price range (1-4)", ge=1, le=4),
    limit: int = Query(1000, description="Maximum results", ge=1, le=10000),
    db: Session = Depends(get_db)
):
    """
    Find restaurants near a location

    Example: /restaurants/nearby?lat=41.8902&lon=12.4922&radius=3&cuisine=italian&min_rating=4.5
    """

    service = RestaurantService(db)

    # Query with cache-first strategy
    results = await service.find_nearby(
        lat=lat,
        lon=lon,
        radius_km=radius,
        cuisine=cuisine,
        min_rating=min_rating,
        max_price=max_price,
        use_cache=True
    )

    # Limit results
    results = results[:limit]

    # Format response
    restaurants = []
    for restaurant, distance_km in results:
        restaurants.append({
            "id": restaurant.db_id,
            "name": restaurant.name,
            "cuisine": restaurant.cuisine,
            "rating": restaurant.rating,
            "price_range": "$" * restaurant.price_range,
            "distance_meters": round(distance_km * 1000, 0),
            "distance_km": round(distance_km, 2),
            "location": {
                "latitude": restaurant.location.latitude,
                "longitude": restaurant.location.longitude,
                "address": restaurant.address
            },
            "cache_age_seconds": round(restaurant.cache_age_seconds, 1)
        })

    # Sort by distance
    restaurants.sort(key=lambda x: x["distance_meters"])

    return {
        "query": {
            "location": {"lat": lat, "lon": lon},
            "radius_km": radius,
            "filters": {
                "cuisine": cuisine,
                "min_rating": min_rating,
                "max_price": max_price
            }
        },
        "total": len(restaurants),
        "results": restaurants
    }
```

> 📄 [View full API code](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/main.py)

---

## Performance Comparison

Real-world benchmarks with 2,600+ restaurants (Paris dataset):

| Scenario | PostgreSQL Only | Redis Cache (Beanis) | Improvement |
|----------|----------------|----------------------|-------------|
| All restaurants (2km) | ~650ms | ~620ms | Consistent sub-second |
| With cuisine filter | ~680ms | ~615ms | ~10% faster |
| Smaller dataset (1030 restaurants) | ~300ms | ~270ms | ~10% faster |

**Cache hit rate:** 100% after warming

**The takeaway:** Redis cache provides **consistent fast response times** and **eliminates database load** for repeated queries. With proper indexing on both sides, you get reliable sub-second performance.

---

## Cache Invalidation Strategies

### Strategy 1: Time-Based Expiration

```python
async def get_with_ttl(restaurant_id: int, max_age: int = 3600):
    """Refresh cache if older than 1 hour"""

    cached = await RestaurantCache.find_one(db_id=restaurant_id)

    if cached and not cached.is_stale(max_age):
        return cached  # Cache fresh

    # Refresh from Postgres
    db_restaurant = db.query(RestaurantDB).get(restaurant_id)

    # Update cache
    if cached:
        cached.cached_at = datetime.now()
        # Update other fields...
        await cached.save()
    else:
        # Create new cache entry
        pass

    return cached
```

### Strategy 2: Write-Through Cache

```python
async def update_restaurant(restaurant_id: int, updates: dict):
    """Update both Postgres and Redis atomically"""

    # Update Postgres (source of truth)
    db_restaurant = db.query(RestaurantDB).get(restaurant_id)
    for key, value in updates.items():
        setattr(db_restaurant, key, value)
    db.commit()

    # Update cache immediately
    cached = await RestaurantCache.find_one(db_id=restaurant_id)
    if cached:
        for key, value in updates.items():
            setattr(cached, key, value)
        cached.cached_at = datetime.now()
        await cached.save()
        print(f"✅ Cache updated for restaurant {restaurant_id}")
```

### Strategy 3: Cache Invalidation on Write

```python
async def delete_restaurant(restaurant_id: int):
    """Delete from both Postgres and Redis"""

    # Delete from Postgres
    db.query(RestaurantDB).filter_by(id=restaurant_id).delete()
    db.commit()

    # Invalidate cache
    cached = await RestaurantCache.find_one(db_id=restaurant_id)
    if cached:
        await cached.delete()
        print(f"🗑️ Cache invalidated for restaurant {restaurant_id}")
```

---

## Real-World Example: API Request Flow

**User Request:** "Find Italian restaurants within 3km of the Colosseum"

```bash
GET /restaurants/nearby?lat=41.8902&lon=12.4922&radius=3&cuisine=italian&min_rating=4.5
```

**What happens:**

1. **Cache Layer (Redis):**
   ```
   ⚡ Checking Redis cache...
   → GEORADIUS RestaurantCache:geo 12.4922 41.8902 3000 m
   → ZRANGEBYSCORE RestaurantCache:idx:cuisine:italian ...
   → ZRANGEBYSCORE RestaurantCache:idx:rating 4.5 +inf
   → Intersection of results
   ✅ Redis cache HIT: 12 results in 6.2ms
   ```

2. **Response (6ms total):**
   ```json
   {
     "total": 12,
     "restaurants": [
       {
         "id": 4521,
         "name": "La Carbonara",
         "cuisine": "italian",
         "rating": 4.8,
         "distance_m": 145,
         "cached_age_seconds": 234.5
       },
       ...
     ]
   }
   ```

**On cache miss:**
```
💨 Redis cache MISS (took 4.1ms)
💾 Querying PostgreSQL...
💾 PostgreSQL: 12 results in 67.3ms
📝 Caching results in Redis...
✅ Response sent in 73ms (next request will be 6ms)
```

---

## Monitoring Cache Performance

Add metrics to track cache effectiveness:

```python
from prometheus_client import Counter, Histogram

cache_hits = Counter('cache_hits_total', 'Number of cache hits')
cache_misses = Counter('cache_misses_total', 'Number of cache misses')
response_time = Histogram('response_time_seconds', 'Response time')

async def find_nearby_with_metrics(...):
    start = time.time()

    results = await RestaurantCache.find_near(**query_params).to_list()

    if results:
        cache_hits.inc()
    else:
        cache_misses.inc()

    response_time.observe(time.time() - start)

    return results
```

**Track:**
- Cache hit rate (should be > 95%)
- Average response time (cache: < 10ms, db: 50-100ms)
- Cache memory usage
- Stale entry count

---

## Conclusion

By using **Beanis as a Redis cache layer** over PostgreSQL, you get:

✅ **Consistent fast response times** for hot queries (sub-second)
✅ **Reduced database load** - cache eliminates repeated expensive queries
✅ **Simple API** - Beanis handles GEOADD, indexes, serialization
✅ **Source of truth** - PostgreSQL remains reliable and persistent
✅ **Real data** - OpenStreetMap provides free, real-world restaurants

**Key principles:**
1. Redis is your **cache**, not your database
2. PostgreSQL is your **source of truth**
3. Cache **hot queries**, not everything
4. Implement **cache invalidation** strategy
5. Monitor **cache hit rates**

---

## Try It Yourself

**Full working example:**
- Repository: [github.com/andreim14/beanis-examples/tree/main/restaurant-finder](https://github.com/andreim14/beanis-examples/tree/main/restaurant-finder)
- Beanis docs: [andreim14.github.io/beanis](https://andreim14.github.io/beanis)

**Quick start:**
```bash
# Clone the repo
git clone https://github.com/andreim14/beanis-examples.git
cd beanis-examples/restaurant-finder

# Install dependencies
pip install -r requirements.txt

# Start databases with Docker
docker run -d --name restaurant-postgres -e POSTGRES_USER=restaurant_user -e POSTGRES_PASSWORD=restaurant_pass -e POSTGRES_DB=restaurant_db -p 5432:5432 postgis/postgis:15-3.3
docker run -d --name restaurant-redis -p 6379:6379 redis:7-alpine

# Start the API
python main.py

# Import sample data (Paris)
curl -X POST "http://localhost:8000/import/area?lat=48.8584&lon=2.2945&radius_km=5"

# Run the interactive demo
python demo.py
```

The demo includes:
- FastAPI REST API with geo-spatial queries
- OpenStreetMap data import
- Redis cache with Beanis
- Interactive CLI demo showing cache performance
- Real-world benchmarks

Questions? Drop a comment below! 🚀

---

*Built with ❤️ by Andrei Stefan Bejgu - AI Applied Scientist @ [SylloTips](https://syllotips.com)*
