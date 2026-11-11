---
layout: post
title: "How to find nearby places in Redis with Python: a restaurant finder with Beanis GeoPoint"
date: 2025-10-30 08:00:00
last_modified_at: 2026-11-11 12:00:00
description: "Store restaurants with a GeoPoint in Redis using Beanis, query them by radius with GEORADIUS, and use Redis as a geo cache in front of PostgreSQL/PostGIS. Complete async Python code."
tags: python redis geospatial cache beanis tutorial architecture
categories: tutorials
giscus_comments: true
related_posts: true
keywords: Redis geospatial Python, GEORADIUS Python, nearby search Redis, Beanis GeoPoint, find_by_geo_radius_with_distance, Redis cache PostgreSQL PostGIS, restaurant finder Redis
author: Andrei Stefan Bejgu
---

This tutorial stores restaurants in Redis with a geo-indexed `GeoPoint` field and answers "what is within 2 km of me?" with one call. It then shows how the [restaurant-finder example](https://github.com/andreim14/beanis-examples/tree/main/restaurant-finder) uses that index as a cache in front of PostgreSQL/PostGIS.

| | |
| --- | --- |
| Package | [`pip install beanis`](https://pypi.org/project/beanis/) (0.2.0) |
| Code | [beanis](https://github.com/andreim14/beanis) · [restaurant-finder example](https://github.com/andreim14/beanis-examples/tree/main/restaurant-finder) |
| Docs | [Geo-spatial guide](https://github.com/andreim14/beanis/blob/main/docs/tutorial/geo-spatial.md) · [andreim14.github.io/beanis](https://andreim14.github.io/beanis/) |
| Requirements | Python 3.9+, Redis 5+ (no modules; geo commands are built in) |

## Minimal example

```bash
docker run -d -p 6379:6379 redis:7
pip install beanis
```

```python
import asyncio

from redis.asyncio import Redis
from typing_extensions import Annotated

from beanis import Document, GeoPoint, Indexed, init_beanis
from beanis.odm.indexes import IndexedField, IndexManager


class Restaurant(Document):
    name: str
    cuisine: Indexed(str)
    rating: Indexed(float)
    location: Annotated[GeoPoint, IndexedField()]  # GEOADD on insert


async def main():
    redis_client = Redis(decode_responses=True)
    await init_beanis(database=redis_client, document_models=[Restaurant])

    for r in [
        Restaurant(name="Near the Colosseum", cuisine="italian", rating=4.6,
                   location=GeoPoint(longitude=12.4930, latitude=41.8925)),
        Restaurant(name="Trastevere", cuisine="italian", rating=4.2,
                   location=GeoPoint(longitude=12.4700, latitude=41.8890)),
        Restaurant(name="Termini", cuisine="japanese", rating=4.4,
                   location=GeoPoint(longitude=12.5010, latitude=41.9010)),
    ]:
        await r.insert()

    hits = await IndexManager.find_by_geo_radius_with_distance(
        redis_client=redis_client,
        document_class=Restaurant,
        field_name="location",
        longitude=12.4922,   # Colosseum
        latitude=41.8902,
        radius=2,
        unit="km",
    )
    hits.sort(key=lambda h: h[1])  # results are not sorted by distance

    for doc_id, distance in hits:
        r = await Restaurant.get(doc_id)
        print(f"{distance:.2f} km  {r.name} ({r.cuisine}, {r.rating})")

    await redis_client.close()


asyncio.run(main())
```

`GeoPoint` takes `longitude` and `latitude` as keyword arguments and rejects values outside -180..180 and -90..90.

Insert with `insert()`, not `insert_many()`. In Beanis 0.2.0 `insert_many()` writes the hashes in one pipeline but does not update the geo or field indexes, so the documents would not show up in radius queries.

## How the geo index works

On insert, Beanis writes the hash `Restaurant:<id>` and runs `GEOADD idx:Restaurant:location <lon> <lat> <id>`. A radius query is a `GEORADIUS` on that key. Redis stores geo members in a sorted set scored by geohash, so the lookup does not compute distances against every row.

Two functions are available:

| Function | Returns |
| --- | --- |
| `IndexManager.find_by_geo_radius(...)` | list of ids |
| `IndexManager.find_by_geo_radius_with_distance(...)` | list of `(id, distance)` in the requested unit |

Both take `redis_client`, `document_class`, `field_name`, `longitude`, `latitude`, `radius` and `unit` (`"m"`, `"km"`, `"mi"`, `"ft"`; default `"km"`). Neither sorts by distance, so sort in Python when order matters.

## How to filter nearby results by cuisine or rating

A geo query returns ids. Combine it with the other indexes using set intersection:

```python
nearby = dict(await IndexManager.find_by_geo_radius_with_distance(
    redis_client, Restaurant, "location", 12.4922, 41.8902, 2, unit="km"
))
good_italian = {r.id for r in await Restaurant.find(cuisine="italian", rating__gte=4.5)}

ids = sorted(nearby.keys() & good_italian, key=nearby.get)
restaurants = await Restaurant.get_many(ids)
```

The restaurant-finder example does the simpler version: it loads every document in the radius and filters on the fields in Python.

## How to use Redis as a geo cache in front of PostgreSQL

In the example, PostgreSQL with PostGIS is the source of truth (OpenStreetMap data is imported there), and Redis holds a `RestaurantCache` copy with the geo index:

<figure class="flow" aria-label="Cache-first nearby search in four steps">
<ol>
<li><b>Query Redis</b><span>GEORADIUS on the cached restaurants</span></li>
<li><b>Hit</b><span>load the documents, filter, return</span></li>
<li><b>Miss</b><span>run the PostGIS query on PostgreSQL</span></li>
<li><b>Warm</b><span>insert the rows into Redis for the next request</span></li>
</ol>
<figcaption>The flow in restaurant_service.py of the restaurant-finder example.</figcaption>
</figure>

A sketch of that flow, with your own PostgreSQL loader passed in:

```python
async def nearby(redis_client, lon, lat, radius_km, load_from_postgres):
    hits = await IndexManager.find_by_geo_radius_with_distance(
        redis_client, Restaurant, "location", lon, lat, radius_km, unit="km"
    )
    if hits:
        hits.sort(key=lambda h: h[1])
        docs = await Restaurant.get_many([doc_id for doc_id, _ in hits])
        live = [d for d in docs if d is not None]  # None: hash expired or deleted
        if live:
            return live

    rows = await load_from_postgres(lon, lat, radius_km)  # your PostGIS query
    docs = [
        Restaurant(
            id=str(row["id"]),
            name=row["name"],
            cuisine=row["cuisine"],
            rating=row["rating"],
            location=GeoPoint(longitude=row["lon"], latitude=row["lat"]),
        )
        for row in rows
    ]
    for doc in docs:
        await doc.insert()  # insert() also updates the geo and field indexes
    return docs
```

Using the PostgreSQL id as the Redis id means a later change can target the same key.

## How to keep the cache fresh

- **Expire entries.** `await doc.insert(ttl=3600)` or `default_ttl` in `class Settings`. The hash expires, but its id stays in the index sets, so `get()` returns `None` for it. The sketch above skips those and goes to PostgreSQL when nothing live is left.
- **Invalidate on write.** When a restaurant changes in PostgreSQL, call `await Restaurant.delete(str(db_id))`. It deletes the hash and removes the id from the geo and field indexes. The next miss reloads it.
- **Replace on write.** Delete, then insert the new version. Prefer this over `update()` for indexed fields like `location`, `cuisine` or `rating`, since `update()` writes the hash fields only.

## Performance

The [geo guide](https://github.com/andreim14/beanis/blob/main/docs/tutorial/geo-spatial.md) reports about 0.2 ms per radius query. The repo also has a geo benchmark you can run on your own hardware: [`benchmarks/benchmark_geospatial.py`](https://github.com/andreim14/beanis/blob/main/benchmarks/benchmark_geospatial.py). End-to-end API time is a different number: the restaurant-finder README reports first and cached calls of the same order (about 650 ms and 620 ms on 2,643 Paris restaurants), so profile the document loading and filtering around the geo lookup before expecting large gains from the cache.

## Run the full example

```bash
git clone https://github.com/andreim14/beanis-examples.git
cd beanis-examples/restaurant-finder
pip install -r requirements.txt

docker run -d --name restaurant-postgres \
  -e POSTGRES_USER=restaurant_user \
  -e POSTGRES_PASSWORD=restaurant_pass \
  -e POSTGRES_DB=restaurant_db \
  -p 5432:5432 postgis/postgis:15-3.3
docker run -d --name restaurant-redis -p 6379:6379 redis:7-alpine

python main.py   # FastAPI on :8000, leave it running
# in a second terminal: import Rome from OpenStreetMap, then run the demo
curl -X POST "http://localhost:8000/import/area?lat=41.8902&lon=12.4922&radius_km=5"
python demo.py
```

## Questions people ask

**Does Redis geo search need Redis Stack?**
No. `GEOADD` and `GEORADIUS` are core Redis commands, and Beanis's geo index uses only those.

**Are the results sorted by distance?**
Not in Beanis 0.2.0. Both radius functions call `GEORADIUS` without a sort option, so sort the `(id, distance)` list yourself.

**Can I query by bounding box or polygon?**
Beanis exposes radius queries only. For polygons keep using PostGIS.

**Why use Redis if PostGIS already does radius queries?**
To move repeated read traffic off the primary database. PostGIS stays the source of truth and Redis holds a disposable copy you can rebuild from it.

**What happens if Redis loses the data?**
Nothing permanent. Every request becomes a miss until the cache is warm again from PostgreSQL.

## Links

- PyPI: [pypi.org/project/beanis](https://pypi.org/project/beanis/)
- GitHub: [github.com/andreim14/beanis](https://github.com/andreim14/beanis)
- Docs: [andreim14.github.io/beanis](https://andreim14.github.io/beanis/)
- Example: [beanis-examples/restaurant-finder](https://github.com/andreim14/beanis-examples/tree/main/restaurant-finder)
- Redis geospatial commands: [redis.io](https://redis.io/docs/latest/develop/data-types/geospatial/)
