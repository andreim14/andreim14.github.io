---
layout: post
title: "Redis Geo-Spatial Cache: Build a Restaurant Finder with Beanis and PostgreSQL"
date: 2025-10-30 08:00:00
description: "How to use Redis (via the Beanis ODM) as a geo-spatial cache in front of PostgreSQL/PostGIS, with OpenStreetMap data, to serve nearby-restaurant queries in about 12ms."
tags: python redis geospatial cache beanis tutorial architecture
categories: tutorials
giscus_comments: true
related_posts: true
thumbnail: assets/img/geo-search.png
keywords: Redis cache, geospatial queries, Beanis, GeoPoint, GEORADIUS, PostgreSQL cache, OpenStreetMap, location search, Python
author: Andrei Stefan Bejgu
---

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.html path="assets/img/geo-search.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

## TL;DR

A geo-spatial cache is a Redis layer that pre-computes location indexes (geohashes) so radius queries ("restaurants within 2km") return in milliseconds instead of hitting PostGIS on every request. This tutorial puts [Beanis](https://andreim14.github.io/beanis) (a Redis ODM) in front of PostgreSQL, imports [OpenStreetMap](https://www.openstreetmap.org/) data, and serves nearby queries in about 12ms.

- **Pattern:** PostgreSQL/PostGIS is the source of truth; Redis is the read cache.
- **Redis primitives:** `GEOADD` and `GEORADIUS`, wrapped by Beanis's `GeoPoint` type.
- **Measured result:** a 750ms PostGIS query becomes a 12ms Redis lookup (62x faster) on a 2,600+ restaurant Paris dataset.
- **Code:** [github.com/andreim14/beanis-examples/tree/main/restaurant-finder](https://github.com/andreim14/beanis-examples/tree/main/restaurant-finder)
- **Docs:** [andreim14.github.io/beanis](https://andreim14.github.io/beanis)

## The problem: geo queries are expensive to recompute

Say you are building a food delivery app. A user opens it in downtown Rome and wants Italian restaurants within 2km. Straightforward.

Here is the PostgreSQL query with [PostGIS](https://postgis.net/), the standard geo-spatial extension for PostgreSQL:

```sql
SELECT *,
       ST_Distance(location, ST_MakePoint(12.4922, 41.8902)) as distance
FROM restaurants
WHERE ST_DWithin(
    location,
    ST_MakePoint(12.4922, 41.8902),
    2000  -- 2km in meters
)
AND cuisine = 'italian'
AND rating >= 4.5
ORDER BY distance
LIMIT 20;
```

This query takes **750 milliseconds** on a modern database server, with indexes. That sounds tolerable until you do the concurrency math.

### The concurrency math

At lunch rush you might have 10,000 concurrent users opening the app, scrolling, and changing filters. That is not 10,000 queries; as users pan the map it is closer to 50,000 queries in a few minutes.

PostgreSQL handles maybe 150 of these geo-spatial queries per second on decent hardware. You need around 830 per second. The database is now 5.5x overloaded, CPU pinned at 100%, queries timing out, and users watching a spinner.

The reason is that [PostGIS distance calculations](https://postgis.net/docs/ST_Distance.html) are computationally expensive. Every query has to:

- Calculate spherical distances (the earth is not flat)
- Check each of your 50,000 restaurants
- Sort by distance
- Apply your filters

It does all that math from scratch, every time, just to report that La Carbonara is 450 meters away.

### Scaling Postgres does not fix the root cause

You could add read replicas, shard by geography, or buy bigger servers. At peak you would need roughly 500 database connections running geo-spatial calculations at once, which is expensive, and you are still recomputing the same answers for queries that barely change. Restaurant locations do not move.

### The fix: cache the pre-computed indexes in Redis

Cache the hot queries in Redis, and specifically the geo-spatial indexes rather than raw rows.

Redis has built-in [geo-spatial commands](https://redis.io/docs/latest/develop/data-types/geospatial/) (`GEOADD`, `GEORADIUS`) built for this. They pre-compute geohashes, store them in memory, and serve 10,000+ geo queries per second on a single instance.

What changes:

- **Response time:** 750ms to 12ms (62x faster)
- **Database load:** 100% CPU to near idle
- **Concurrency:** 150/sec ceiling to 10,000+/sec
- **Infrastructure cost:** a single Redis instance

PostgreSQL stays the source of truth (persistent, reliable, handles writes). Redis becomes the speed layer (ephemeral, fast, serves 99% of reads). Cache misses still cost 750ms while you populate Redis, but once the cache is warm the database goes back to transactions and complex queries instead of recomputing the same distances all day.

## Architecture

The data flow is simple:

```
OpenStreetMap API
        ↓ (import once)
   PostgreSQL
        ↓ (sync to cache)
    Redis Cache
        ↓ (serve queries)
   Your Users
```

PostgreSQL holds all restaurant data, handles writes, and maintains referential integrity. Redis sits in front as a cache. On import you push data to Redis and build geo-spatial indexes. When a user queries "restaurants near me," you hit Redis first: 12ms, no database load.

`GEOADD` and `GEORADIUS` do the heavy lifting. You give Redis a set of coordinates, it pre-computes geohashes and stores them so radius queries are fast, with no spherical-distance math at query time.

### How it works in practice

When you save a restaurant to Redis through Beanis, it:

1. Creates a Redis hash with all the restaurant data
2. Adds the location to a geo-spatial index (`GEOADD` under the hood)
3. Creates sorted sets for your filters (cuisine, rating, price, and so on)

When a user queries nearby restaurants:

1. `GEORADIUS` finds all restaurants within the radius (< 5ms)
2. You filter by cuisine/rating using the sorted sets (< 2ms)
3. You fetch the full documents and return them (< 5ms)
4. Total: ~12ms, with no database work

On a cache miss you fall back to PostgreSQL, get results in 750ms, cache them, and serve them. The next request for that area takes 12ms.

### What you are building

This tutorial covers how to:

- Use Beanis's `GeoPoint` type to handle geo-spatial indexing automatically
- Implement a cache-first strategy with PostgreSQL fallback
- Import real restaurant data from [OpenStreetMap](https://www.openstreetmap.org/)
- Build a FastAPI app that handles 10,000+ concurrent users

The key idea: Redis is not your database, it is your speed layer. PostgreSQL can rebuild the cache anytime, so Redis durability is not a concern. You trade a little staleness (cached data can be a few seconds old) for a large performance gain.

## Step 1: The Redis cache model

The essential Beanis code for caching restaurant data:

```python
from beanis import Document, Indexed, GeoPoint
from beanis.odm.indexes import IndexedField
from typing_extensions import Annotated

class RestaurantCache(Document):
    """Redis cache model - mirrors PostgreSQL data"""

    # Source tracking
    db_id: Indexed(int)  # Link to PostgreSQL
    name: str

    # Geo-spatial index
    location: Annotated[GeoPoint, IndexedField()]
    # This automatically creates a Redis GEORADIUS index

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

What Beanis does automatically:

1. `location: Annotated[GeoPoint, IndexedField()]` creates a `GEOADD` index in Redis
2. `Indexed(str/int/float/bool)` creates sorted sets for filtering
3. `Document` handles serialization and Redis hash storage

> [Full code with all fields](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/models/cache.py)

## Step 2: Caching data

The key Beanis operation is saving to Redis:

```python
from beanis import GeoPoint

# Create and save to Redis
restaurant = RestaurantCache(
    db_id=123,
    name="La Carbonara",
    location=GeoPoint(latitude=41.8933, longitude=12.4829),  # Geo-spatial index
    cuisine="italian",
    rating=4.5,
    price_range=2,
    is_active=True
)

await restaurant.insert()  # Saves to Redis with all indexes
```

What Beanis does behind the scenes:

1. Creates a Redis hash: `RestaurantCache:123` → `{name: "La Carbonara", ...}`
2. Creates the geo-index: `GEOADD RestaurantCache:location 12.4829 41.8933 "123"`
3. Creates sorted sets for filters:
   - `RestaurantCache:idx:cuisine:italian` → `{123, ...}`
   - `RestaurantCache:idx:rating` → `{(123, 4.5), ...}`
   - `RestaurantCache:idx:price_range` → `{(123, 2), ...}`

> [Full caching logic](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/services/restaurant_service.py#L162-L206)

## Step 3: Querying with geo-spatial search

The core feature is finding nearby restaurants:

```python
from beanis.odm.indexes import IndexManager

# Query the Redis geo-spatial index
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

What this does:

1. Uses the Redis `GEORADIUS` command internally
2. Returns document IDs sorted by distance
3. Lets you fetch the full documents as needed
4. Can filter further with indexed fields (cuisine, rating, and so on)

With filters:

```python
# Fetch and filter
results = []
for doc_id, distance in results_with_distance:
    doc = await RestaurantCache.get(doc_id)

    # Filter using indexed fields (fast in-memory)
    if doc.cuisine == "italian" and doc.rating >= 4.5:
        results.append((doc, distance))
```

> [Full implementation with cache-first strategy](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/services/restaurant_service.py)

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
        document_models=[RestaurantCache]  # Register your models
    )
```

On startup Beanis will:

1. Create all geo-spatial indexes
2. Create all sorted set indexes
3. Handle serialization and deserialization

> [Full FastAPI example with endpoints](https://github.com/andreim14/beanis-examples/blob/main/restaurant-finder/main.py)

## Performance comparison

These are measured numbers from a real Paris dataset of 2,600+ restaurants imported from OpenStreetMap, not theoretical figures.

| Scenario                                | PostgreSQL             | Redis (Beanis)   |
| --------------------------------------- | ---------------------- | ---------------- |
| Cold start (first query + cache write)  | 850ms + 120ms = ~970ms | n/a (populating) |
| Warm cache, same query                  | 750ms                  | 12ms             |
| Warm cache with cuisine + rating filter | 820ms                  | 15ms             |
| Smaller dataset (1,030 restaurants)     | 380ms                  | 8ms              |
| 100 users x 10 queries (1,000 total)    | 75s                    | 1.2s             |

Notes on each row:

- **Cold start** happens once per cache region: PostgreSQL computes distances and sorts (850ms), then Beanis writes the results to Redis (120ms).
- **Warm cache** is the common path. Same query, 62x faster.
- **Filters** barely cost extra on Redis because the sorted sets are pre-computed.
- **Concurrency** is where the gap is starkest: under 100 concurrent users the PostgreSQL path queues up and pins CPU, while Redis stays effectively instant.

Once the cache is warm the hit rate sits around 99.8%, nearly every query is served from Redis at 12-15ms, and database CPU drops from 100% to roughly 1% for occasional refreshes. Throughput moves from ~150 req/sec (the PostgreSQL bottleneck) to 10,000+ req/sec (limited by network and application code, not Redis).

The gap widens as the dataset grows. At 50,000 restaurants a PostgreSQL query would run 1.5-2 seconds; Redis stays at 12-15ms because the pre-computed indexes are far less sensitive to dataset size.

## Cache invalidation strategies

The cache is fast, but restaurant data changes. You have three options depending on your freshness needs.

### Time-based expiration

Set a TTL and refresh from PostgreSQL when a cached entry is older than a threshold:

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

This suits data that rarely changes. Restaurant info changes rarely, locations never move, and ratings might update hourly, so slight staleness is acceptable.

### Write-through

For fresher data, update PostgreSQL and Redis together on every change:

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
        print(f"Cache updated for restaurant {restaurant_id}")
```

Writes get slightly slower (you touch two systems), but reads stay fast and you never serve stale data.

### Invalidate on write

Sometimes you just delete the cache entry and let it rebuild on the next read:

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
        print(f"Cache invalidated for restaurant {restaurant_id}")
```

Simple and safe. The next read is a cache miss, then the cache rebuilds itself. Good for deletions or when you are unsure what changed.

**Which to use?** For restaurant data, start with time-based expiration (hourly refresh) and add write-through only if users report staleness. Invalidate-on-write is fine for deletions and rare updates.

## End-to-end example

A user near the Colosseum in Rome searches for Italian restaurants within 3km:

```bash
GET /restaurants/nearby?lat=41.8902&lon=12.4922&radius=3&cuisine=italian&min_rating=4.5
```

### Warm cache (about 99% of requests)

The app hits Redis first. Beanis runs:

1. `GEORADIUS` to find all restaurants within 3km (~4ms)
2. Filter by cuisine using the sorted set (~1ms)
3. Filter by rating using another sorted set (~1ms)
4. Fetch the full documents for the matches (~2ms)

Total: 8ms. With API overhead (JSON serialization, HTTP) the user sees ~12-15ms. The database does nothing.

```json
{
  "total": 12,
  "restaurants": [
    {
      "id": 4521,
      "name": "La Carbonara",
      "cuisine": "italian",
      "rating": 4.8,
      "distance_m": 145
    },
    ...
  ]
}
```

### Cold cache (about 1% of requests)

Redis has no data for this area yet:

1. Redis miss (~4ms to check)
2. Fall back to PostgreSQL (~750ms for the geo query)
3. Cache the results in Redis (~120ms to write)
4. Return the data

Total: ~870ms, once per geographic area. Every subsequent query for that area hits the cache at 12ms.

## Monitoring cache performance

Track cache effectiveness with metrics:

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

What to track:

- Cache hit rate (should be > 95%)
- Average response time (cache: < 10ms, db: 50-100ms)
- Cache memory usage
- Stale entry count

For production, consider [Redis monitoring and memory optimization](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/) and alert on hit rate and memory usage.

## Summary

Using Beanis as a Redis cache over PostgreSQL turns a 750ms geo query into a 12ms lookup: the difference between an app that feels sluggish and one that feels instant.

PostgreSQL stays the source of truth (writes, integrity, cache rebuilds). Redis is the speed layer (99% of reads, high concurrency, idle database). The pattern works because restaurant data changes little: locations never move and ratings update occasionally, so slightly stale cache data (refreshed hourly or on writes) buys a 62x speedup.

Treat Redis as a cache, not a database. If it crashes, PostgreSQL rebuilds it. Beanis handles the Redis commands: you define a model with `GeoPoint`, call `find_by_geo_radius`, and skip the manual `GEOADD`/`GEORADIUS` and serialization work.

## Quick start

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

The demo includes a FastAPI REST API with geo-spatial queries, OpenStreetMap import, the Redis cache via Beanis, an interactive CLI showing cache performance, and the benchmarks above.

## FAQ

### What is a geo-spatial cache?

It is a cache layer (here, Redis) that stores pre-computed location indexes so radius and nearest-neighbor queries return in milliseconds, instead of recomputing spherical distances in the database on every request.

### Why not just query PostGIS directly?

PostGIS is accurate and reliable, but each `ST_Distance`/`ST_DWithin` query recomputes distances from scratch. Under high concurrency (hundreds of geo queries per second) it saturates CPU. Redis serves the same answers from pre-built geohash indexes at roughly 62x lower latency.

### What is Beanis?

Beanis is a Redis object-document mapper for Python. Its `GeoPoint` type and `Indexed` fields generate the underlying `GEOADD`, `GEORADIUS`, and sorted-set commands, so you work with Python models instead of raw Redis commands.

### Does Redis replace PostgreSQL here?

No. PostgreSQL remains the source of truth for writes and integrity, and can rebuild the cache at any time. Redis is a read cache that serves about 99% of queries and can be discarded safely.

### How do I keep the cache fresh?

Choose based on freshness needs: time-based expiration (hourly TTL) for data that changes rarely, write-through to update both stores on every change, or invalidate-on-write to drop entries and rebuild them on the next read.

### How much faster is Redis in these benchmarks?

On a 2,600+ restaurant Paris dataset, a warm-cache query drops from 750ms (PostgreSQL) to 12ms (Redis), about 62x. Under 100 concurrent users running 1,000 total queries, total time falls from 75s to 1.2s.

### Where does the restaurant data come from?

From [OpenStreetMap](https://www.openstreetmap.org/). The example imports an area once into PostgreSQL, then syncs it into the Redis cache.

## Resources

- **Example code:** [github.com/andreim14/beanis-examples/tree/main/restaurant-finder](https://github.com/andreim14/beanis-examples/tree/main/restaurant-finder)
- **Beanis docs:** [andreim14.github.io/beanis](https://andreim14.github.io/beanis)
- **Redis geo-spatial commands:** [redis.io geospatial docs](https://redis.io/docs/latest/develop/data-types/geospatial/)
- **PostGIS:** [postgis.net](https://postgis.net/)
- **OpenStreetMap:** [openstreetmap.org](https://www.openstreetmap.org/)
  </content>
