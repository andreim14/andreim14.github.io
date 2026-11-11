---
layout: post
title: "Beanis: an async Redis ODM for Python with Pydantic models"
date: 2025-10-23 23:00:00
last_modified_at: 2026-11-11 12:00:00
description: "Beanis maps Pydantic models to Redis hashes, keeps secondary indexes for you and gives you a Beanie-style async API. Install, define a model, insert, query by index, set TTLs."
tags: python redis database odm pydantic open-source
categories: projects
giscus_comments: true
related_posts: true
keywords: Beanis, Redis ODM Python, Pydantic Redis, async Redis ORM, redis-py object mapper, Redis secondary index Python, Beanie for Redis
author: Andrei Stefan Bejgu
---

Beanis is an open-source async object-document mapper (ODM) for Redis. You define Pydantic models, and Beanis stores them as Redis hashes, maintains secondary indexes and turns them back into typed objects. By the end of this post you will have a working model with validation, index queries and TTLs.

| | |
| --- | --- |
| Package | [`pip install beanis`](https://pypi.org/project/beanis/) (0.2.0) |
| Code | [github.com/andreim14/beanis](https://github.com/andreim14/beanis) (Apache 2.0) |
| Docs | [andreim14.github.io/beanis](https://andreim14.github.io/beanis/) |
| Requirements | Python 3.9+, Pydantic (`>=1.10,<3`), `redis-py` 5+ async client, Redis 5+. No Redis modules for core features; vector search needs RediSearch (Redis Stack). |

## Minimal example

Start Redis (`docker run -d -p 6379:6379 redis:7`), then:

```python
import asyncio
from typing import Optional

from redis.asyncio import Redis
from beanis import Document, Indexed, init_beanis


class Product(Document):
    name: str
    description: Optional[str] = None
    price: Indexed(float)          # sorted set index: range queries
    category: Indexed(str)         # set index: exact match
    stock: int = 0


async def main():
    client = Redis(host="localhost", port=6379, decode_responses=True)
    await init_beanis(database=client, document_models=[Product])

    product = Product(name="Tony's Chocolonely", price=5.95, category="chocolate", stock=100)
    await product.insert()

    found = await Product.get(product.id)
    print(found.name, found.price)

    cheap = await Product.find(price__lte=10.0)
    chocolate = await Product.find(category="chocolate", price__gte=1.0)
    print(len(cheap), len(chocolate))

    await product.update(price=6.95, stock=150)
    print(await product.increment_field("stock", -1))  # atomic HINCRBY

    await product.delete_self()
    await client.close()


asyncio.run(main())
```

`decode_responses=True` is required: Beanis expects strings back from Redis, not bytes.

## Why Beanis exists

Redis is fast, but the code around a hash is repetitive. Every read converts strings back to numbers, every nested object goes through `json.dumps` and `json.loads`, and every secondary index is a sorted set or set you update by hand:

```python
raw = await redis.hgetall(f"Product:{product_id}")
product = {
    "name": raw["name"],
    "price": float(raw["price"]),
    "category": json.loads(raw["category"]),
}
```

With Beanis that becomes `await Product.get(product_id)`, and you get a validated `Product` back.

I like [Beanie](https://github.com/BeanieODM/beanie), the MongoDB ODM. Beanis started as a fork of it and keeps its style (Pydantic models, `init_*` call, event hooks) on top of plain Redis commands. Compared with Redis OM, Beanis does not need the RedisJSON or RediSearch modules for documents, indexes or geo queries.

## How Beanis stores a document in Redis

For `Product` with id `abc`:

| Redis key | Type | Holds |
| --- | --- | --- |
| `Product:abc` | hash | the fields; nested models, lists and dicts as JSON strings |
| `all:Product` | sorted set | every id, scored by insert time (used by `all()` and `count()`) |
| `idx:Product:price` | sorted set | id scored by price (`int` and `float` fields) |
| `idx:Product:category:chocolate` | set | ids with that exact value (other indexed types) |
| `idx:Product:location` | geo set | ids by coordinates (`GeoPoint` fields) |

The key prefix defaults to the class name. Set `key_prefix` in `class Settings` to change it.

## How to query by index

`find()` takes keyword filters on indexed fields and returns a list. Several filters are combined with AND (set intersection).

```python
await Product.find(category="chocolate")                # exact match on a set index
await Product.find(price__gte=10, price__lte=50)        # range on a sorted set index
await Product.find(category="chocolate", price__lte=5)  # both
```

Range operators work on `int` and `float` fields. Use `__gte` and `__lte`. Strings, booleans and dates are indexed for exact match only. Filtering on a field that is not indexed raises `ValueError`.

Indexes are written by `insert()`. In 0.2.0, `insert_many()` and `update()` write the hash only, so use `insert()` for documents you want to find by index.

For everything else there are id-based and scan-style helpers:

```python
products = await Product.get_many([id1, id2, id3])   # pipelined, returns None for missing ids
page = await Product.all(skip=0, limit=20, sort_desc=True)
total = await Product.count()
exists = await Product.exists(id1)
```

## How to validate data before it reaches Redis

Models are Pydantic models, so constraints are checked when you build the object:

```python
from pydantic import Field, ValidationError
from beanis import Document, Indexed


class User(Document):
    username: str = Field(min_length=3, max_length=20)
    age: int = Field(ge=13, le=120)
    score: Indexed(int) = 0


try:
    User(username="ab", age=200)
except ValidationError as e:
    print(e)  # two errors, nothing written to Redis
```

Reads skip validation by default (`model_construct`), because the data came from your own writes. Set `use_validation_on_fetch = True` in `Settings` if you want reads validated too.

## How to expire documents with TTL

```python
await product.insert(ttl=3600)     # expires in one hour
await product.set_ttl(7200)
print(await product.get_ttl())
await product.persist()            # remove the expiry
```

You can also set `default_ttl` in `Settings`.

## How to run code before or after insert, update, delete

```python
from beanis import Document, before_event, after_event, Insert, Update


class Order(Document):
    total: float
    status: str = "pending"

    @before_event(Insert)
    async def check_total(self):
        if self.total < 0:
            raise ValueError("total cannot be negative")

    @after_event(Update)
    async def log_update(self):
        print(f"order {self.id} updated")
```

## How to store custom types (NumPy, your own classes)

NumPy arrays and PyTorch tensors are registered automatically when those libraries are installed. For your own types, register an encoder and decoder that convert to and from a string:

```python
from dataclasses import dataclass
from beanis import register_type


@dataclass
class Money:
    amount: str
    currency: str


register_type(
    Money,
    encoder=lambda m: f"{m.amount}:{m.currency}",
    decoder=lambda s: Money(*s.split(":")),
)
```

`register_encoder(type_)` and `register_decoder(type_)` do the same as decorators.

## Geo and vector fields

Two index types go beyond sets and sorted sets:

- `GeoPoint` with an index uses `GEOADD` and `GEORADIUS`. See [the restaurant finder tutorial]({% post_url 2025-10-30-building-restaurant-finder-redis-geopoints %}).
- `VectorField(dimensions=...)` creates a RediSearch HNSW index at `init_beanis` time. This one needs Redis Stack. See [the RAG tutorial]({% post_url 2025-10-24-build-rag-50-lines-beanis-redis %}).

## Performance

The [README](https://github.com/andreim14/beanis#readme) reports about 8% overhead over plain `redis-py` for get-by-id. The benchmark script behind that number is not in the repo, so treat it as indicative. The design choices that keep reads cheap are visible in the source: `msgspec` for JSON parsing, `model_construct()` instead of full validation on reads, and pipelines for `insert_many`, `get_many` and `delete_many`.

## When not to use Beanis

- Plain key-value caching, where a `GET`/`SET` is all you need.
- You need full-text search or JSON path queries: use RediSearch and RedisJSON directly, or Redis OM.
- You need relations or aggregations. Beanis has neither (Beanie's `Link`, aggregation pipelines and migrations were removed).

## Questions people ask

**What is the difference between Beanis and Redis OM?**
Redis OM relies on the RediSearch module for queries (and RedisJSON for JSON models). Beanis stores hashes and builds its indexes from plain sets, sorted sets and geo sets, so it runs on stock Redis.

**Does Beanis work with Pydantic v2?**
Yes. The package declares `pydantic>=1.10,<3`, and the geo type uses Pydantic v2 validators.

**Can I use `Indexed[float]` like in Beanie?**
No. In Beanis `Indexed` is a function: write `Indexed(float)`, or `Annotated[float, IndexedField()]`.

**Is `update()` atomic?**
`update(**fields)` writes the given fields with one `HSET`. For counters use `increment_field()`, which is a single `HINCRBY` (or `HINCRBYFLOAT` for floats).

**Which Python versions are supported?**
Python 3.9 and later, per the package metadata on PyPI.

## Links

- PyPI: [pypi.org/project/beanis](https://pypi.org/project/beanis/)
- GitHub: [github.com/andreim14/beanis](https://github.com/andreim14/beanis)
- Docs: [andreim14.github.io/beanis](https://andreim14.github.io/beanis/)
- Examples: [github.com/andreim14/beanis-examples](https://github.com/andreim14/beanis-examples)
