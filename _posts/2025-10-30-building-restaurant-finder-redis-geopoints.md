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

Here's the essential Beanis code for caching restaurant data:

```python
from beanis import Document, Indexed, GeoPoint
from beanis.odm.indexes import IndexedField
from typing_extensions import Annotated

class RestaurantCache(Document):
    """Redis cache model - mirrors PostgreSQL data"""

    # Source tracking
    db_id: Indexed(int)  # Link to PostgreSQL
    name: str

    # ⭐ The magic: Geo-spatial index
    location: Annotated[GeoPoint, IndexedField()]
    # This automatically creates Redis GEORADIUS index!

    # Indexed fields for fast filtering
    cuisine: Indexed(str)      # Creates sorted set
    rating: Indexed(float)      # Creates sorted set
    price_range: Indexed(int)   # Creates sorted set
    is_active: Indexed(bool)    # Creates sorted set

    # Other fields (not indexed)
    address: str = ""
    phone: Optional[str] = None
    cached_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "RestaurantCache"
```

**What Beanis does automatically:**
1. `location: Annotated[GeoPoint, IndexedField()]` → Creates `GEOADD` index in Redis
2. `Indexed(str/int/float/bool)` → Creates sorted sets for filtering
3. `Document` → Handles serialization and Redis hash storage

> 📄 [Full code with all fields](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/models/cache.py)

---

## Step 2: Caching Data

The key Beanis operation - saving to Redis:

```python
from beanis import GeoPoint

# Create and save to Redis
restaurant = RestaurantCache(
    db_id=123,
    name="La Carbonara",
    location=GeoPoint(latitude=41.8933, longitude=12.4829),  # ⭐ Geo-spatial index
    cuisine="italian",
    rating=4.5,
    price_range=2,
    is_active=True
)

await restaurant.insert()  # Saves to Redis with all indexes
```

**What Beanis does behind the scenes:**
1. Creates Redis hash: `RestaurantCache:123` → `{name: "La Carbonara", ...}`
2. Creates geo-index: `GEOADD RestaurantCache:location 12.4829 41.8933 "123"`
3. Creates sorted sets for filters:
   - `RestaurantCache:idx:cuisine:italian` → `{123, ...}`
   - `RestaurantCache:idx:rating` → `{(123, 4.5), ...}`
   - `RestaurantCache:idx:price_range` → `{(123, 2), ...}`

> 📄 [Full caching logic](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/services/restaurant_service.py#L162-L206)

---

## Step 3: Querying with Geo-Spatial Search

The core Beanis feature - finding nearby restaurants:

```python
from beanis.odm.indexes import IndexManager

# ⭐ Query Redis geo-spatial index
results_with_distance = await IndexManager.find_by_geo_radius_with_distance(
    redis_client=redis_client,
    document_class=RestaurantCache,
    field_name="location",
    longitude=12.4922,
    latitude=41.8902,
    radius=2.0,  # 2km
    unit="km"
)

# Returns: [(doc_id, distance_km), ...]
# Example: [("123", 0.45), ("456", 1.2), ("789", 1.8)]

# Get full documents
for doc_id, distance in results_with_distance:
    restaurant = await RestaurantCache.get(doc_id)
    print(f"{restaurant.name}: {distance:.2f}km away")
```

**What this does:**
1. Uses Redis `GEORADIUS` command internally
2. Returns document IDs sorted by distance
3. You fetch the full documents as needed
4. Can filter further with indexed fields (cuisine, rating, etc.)

**With filters:**

```python
# Fetch and filter
results = []
for doc_id, distance in results_with_distance:
    doc = await RestaurantCache.get(doc_id)

    # Filter using indexed fields (fast in-memory)
    if doc.cuisine == "italian" and doc.rating >= 4.5:
        results.append((doc, distance))
```

> 📄 [Full implementation with cache-first strategy](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/services/restaurant_service.py)

---

## Step 4: Initialization

Initialize Beanis on application startup:

```python
from fastapi import FastAPI
from beanis import init_beanis
import redis.asyncio as redis

app = FastAPI()

@app.on_event("startup")
async def startup():
    # Connect to Redis
    redis_client = redis.Redis(
        host="localhost",
        port=6379,
        decode_responses=True
    )

    # Initialize Beanis with your document models
    await init_beanis(
        database=redis_client,
        document_models=[RestaurantCache]  # ⭐ Register your models
    )
```

That's it! Beanis will:
1. Create all geo-spatial indexes
2. Create all sorted set indexes
3. Handle serialization/deserialization

> 📄 [Full FastAPI example with endpoints](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/main.py)

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
