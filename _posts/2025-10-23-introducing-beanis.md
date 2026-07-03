---
layout: post
title: "Beanis: A Typed Redis ODM for Python with Pydantic v2"
date: 2025-10-23 23:00:00
description: "Beanis is an async, Pydantic v2 object-document mapper for vanilla Redis. It cuts serialization boilerplate by about 70% and stays within roughly 8% of raw redis-py performance."
tags: python redis database odm pydantic open-source
categories: projects
giscus_comments: true
related_posts: true
thumbnail: assets/img/beanis-social.png
keywords: Redis ODM, Python Redis, Pydantic Redis, Redis object mapper, async Redis, type-safe Redis, Redis serialization, Redis indexing
author: Andrei Stefan Bejgu
---

## TL;DR

**Beanis** is an object-document mapper (ODM) for Redis that maps Pydantic v2 models to Redis hashes, handles serialization and indexing for you, and keeps an async-first, Beanie-style API. It runs on vanilla Redis with no RedisJSON or RediSearch modules required.

- **Package:** `pip install beanis` ([PyPI](https://pypi.org/project/beanis/))
- **Code:** [github.com/andreim14/beanis](https://github.com/andreim14/beanis)
- **Docs:** [andreim14.github.io/beanis](https://andreim14.github.io/beanis)
- **Boilerplate:** roughly 70% less code than raw `redis-py` for typical CRUD plus queries
- **Overhead:** about 8% slower than raw Redis for the cost of validation, type conversion, and index maintenance

```python
from beanis import Document, Indexed, init_beanis
import redis.asyncio as redis

class User(Document):
    username: str
    email: Indexed[str]
    score: Indexed[int] = 0

client = redis.Redis(decode_responses=True)
await init_beanis(database=client, document_models=[User])

user = User(username="john", email="john@example.com")
await user.insert()

top_users = await User.find(score__gte=100)
```

## The problem: Redis is fast, the code around it is not

Redis is the obvious pick when you need caching and fast key lookups. The application code around it is where things get tedious. Every read and write turns into manual serialization, type conversion, and key management. A typical hash read looks like this:

```python
# Manual read: type conversion for every field
product_key = f"Product:{product_id}"
data = await redis.hgetall(product_key)

product = {
    'name': data.get('name', ''),
    'price': float(data.get('price', 0)) if data.get('price') else 0.0,
    'stock': int(data.get('stock', 0)) if data.get('stock') else 0,
    'tags': json.loads(data.get('tags', '[]')),
    'metadata': json.loads(data.get('metadata', '{}')),
}
```

That is one document, read only, no validation. I wanted the read to look like this instead:

```python
product = await Product.get(product_id)
```

Beanis is what makes that second line work, at about 8% overhead over raw Redis.

## Why build another Redis library

I have spent years working with databases in AI and ML projects, and I like MongoDB ODMs such as [Beanie](https://github.com/roman-right/beanie): a clean API, Pydantic integration, and less CRUD boilerplate. That comfort disappears when you drop down to Redis for performance and end up back in manual serialization and key management.

The existing Redis libraries each had a gap for my use case:

- **Redis OM:** good, but requires the RedisJSON and RediSearch modules, which are not always available.
- **Walrus:** no async support, predates Pydantic v2.
- **Raw redis-py:** fast but verbose, no type safety.

I wanted vanilla Redis compatibility (no modules), Pydantic v2 validation, a Beanie-like API, async-first design, and minimal overhead. Beanis is that combination.

## Example: a product catalog with raw Redis vs Beanis

A product catalog needs fast lookups by ID, range queries on price, category filtering, stock updates, and audit trails.

### Raw redis-py

A single insert plus one range query, with manual indexing on both sides:

```python
import json
import redis.asyncio as redis

async def create_product(redis_client, product_data):
    product_id = await redis_client.incr("product:id:counter")
    product_key = f"Product:{product_id}"

    redis_data = {
        'id': str(product_id),
        'name': product_data['name'],
        'price': str(product_data['price']),
        'category': product_data['category'],
        'stock': str(product_data['stock']),
        'tags': json.dumps(product_data.get('tags', [])),
        'metadata': json.dumps(product_data.get('metadata', {}))
    }

    await redis_client.hset(product_key, mapping=redis_data)

    # Maintain indexes by hand
    await redis_client.zadd(f"Product:idx:price", {product_key: product_data['price']})
    await redis_client.sadd(f"Product:idx:category:{product_data['category']}", product_key)
    await redis_client.sadd("Product:all", product_key)

    return product_id

async def find_products_by_price(redis_client, min_price, max_price):
    keys = await redis_client.zrangebyscore(
        "Product:idx:price",
        min_price,
        max_price
    )

    products = []
    for key in keys:
        data = await redis_client.hgetall(key)
        products.append({
            'id': data['id'],
            'name': data['name'],
            'price': float(data['price']),
            'stock': int(data['stock']),
            'tags': json.loads(data['tags']),
            'metadata': json.loads(data['metadata'])
        })

    return products
```

That is over 50 lines for basic CRUD plus one query, and it still has no input validation, error handling, type safety, audit trails, or cascade deletes.

### Beanis

The same functionality, with validation, audit fields, and automatic indexing built in:

```python
from beanis import Document, Indexed, init_beanis
from beanis.odm.actions import before_event, Insert, Update
from typing import Optional, Set
from datetime import datetime
from pydantic import Field
import redis.asyncio as redis

class Product(Document):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    price: Indexed[float] = Field(gt=0)  # Auto-indexed, validated > 0
    category: Indexed[str]  # Auto-indexed
    stock: int = Field(ge=0)  # Validated >= 0
    tags: Set[str] = set()
    metadata: dict = {}

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    @before_event(Insert)
    async def on_create(self):
        self.created_at = datetime.now()

    @before_event(Update)
    async def on_update(self):
        self.updated_at = datetime.now()

    class Settings:
        key_prefix = "Product"

client = redis.Redis(decode_responses=True)
await init_beanis(database=client, document_models=[Product])

product = Product(
    name="MacBook Pro M3",
    price=2499.99,
    category="electronics",
    stock=50,
    tags={"laptop", "apple", "premium"},
    metadata={"warranty": "2 years", "color": "Space Gray"}
)
await product.insert()

# Indexes are handled automatically
expensive = await Product.find(
    category="electronics",
    price__gte=1000,
    price__lte=3000
)

await product.update(stock=45, price=2299.99)

out_of_stock = await Product.find(stock=0)
premium_laptops = await Product.find(
    category="electronics",
    price__gte=2000
)
```

That is about 30 lines including validation, audit trails, and automatic indexing: roughly a 70% reduction in code.

## What Beanis gives you

### Pydantic v2 integration

Beanis brings Pydantic validation to the data layer, so bad data is rejected before it reaches Redis:

```python
from pydantic import EmailStr, HttpUrl, validator
from decimal import Decimal

class User(Document):
    email: EmailStr
    username: str = Field(min_length=3, max_length=20, pattern="^[a-zA-Z0-9_]+$")
    age: int = Field(ge=13, le=120)
    website: Optional[HttpUrl] = None
    balance: Decimal = Decimal("0.00")

    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v.lower()

# Raises validation errors before hitting Redis
try:
    user = User(
        email="not-an-email",
        username="ab",
        age=200
    )
except ValidationError as e:
    print(e)
```

### Automatic indexing

Mark a field `Indexed[...]` and Beanis maintains the backing sorted set for you:

```python
class Article(Document):
    title: str
    views: Indexed[int]
    published_at: Indexed[datetime]
    author: Indexed[str]
    score: Indexed[float]

trending = await Article.find(views__gte=10000)
recent = await Article.find(
    published_at__gte=datetime.now() - timedelta(days=7)
)
popular_by_author = await Article.find(
    author="john_doe",
    score__gte=4.5
)
```

Behind the scenes Beanis maintains a Redis sorted set per indexed field, updates indexes on insert, update, and delete, picks the best index for a query, and cleans up indexes when documents are deleted.

### Custom encoders for any type

Register encoders and decoders for types Redis does not store natively:

```python
import numpy as np
from PIL import Image
from beanis.odm.custom_encoders import register_custom_encoder, register_custom_decoder

@register_custom_encoder(np.ndarray)
def encode_numpy(arr: np.ndarray) -> str:
    return arr.tobytes().hex()

@register_custom_decoder(np.ndarray)
def decode_numpy(data: str, dtype=np.float32) -> np.ndarray:
    return np.frombuffer(bytes.fromhex(data), dtype=dtype)

@register_custom_encoder(Image.Image)
def encode_image(img: Image.Image) -> str:
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()

class MLModel(Document):
    name: str
    weights: np.ndarray
    bias: np.ndarray
    thumbnail: Image.Image

model = MLModel(
    name="sentiment-classifier",
    weights=np.random.rand(100, 50),
    bias=np.zeros(50)
)
await model.insert()
```

### Geo-spatial queries

Store a `GeoPoint` and query by radius:

```python
from beanis import GeoPoint

class Restaurant(Document):
    name: str
    cuisine: Indexed[str]
    location: GeoPoint
    rating: Indexed[float]

italian_nearby = await Restaurant.find_near(
    location=GeoPoint(lat=41.9028, lon=12.4964),  # Rome, Italy
    radius=2000,  # 2km
    category="italian",
    rating__gte=4.0
)

for restaurant in italian_nearby:
    distance = restaurant.location.distance_to(
        GeoPoint(lat=41.9028, lon=12.4964)
    )
    print(f"{restaurant.name}: {distance:.2f}m away")
```

### Lifecycle hooks

Use `before_event` and `after_event` hooks for audit trails, notifications, and cleanup:

```python
class Order(Document):
    user_id: str
    total: Decimal
    status: str = "pending"

    created_at: datetime
    updated_at: datetime
    status_history: list = []

    @before_event(Insert)
    async def set_timestamps(self):
        now = datetime.now()
        self.created_at = now
        self.updated_at = now

    @before_event(Update)
    async def track_changes(self):
        self.updated_at = datetime.now()
        if hasattr(self, '_original_status') and self.status != self._original_status:
            self.status_history.append({
                'from': self._original_status,
                'to': self.status,
                'at': datetime.now().isoformat()
            })

    @after_event(Update)
    async def notify_status_change(self):
        if self.status == "shipped":
            await send_notification(self.user_id, f"Order {self.id} shipped!")

    @after_event(Delete)
    async def cleanup(self):
        await OrderItem.delete_many(order_id=self.id)
```

## Performance

Benchmarked against raw `redis-py` over 10,000 operations:

| Operation          | Raw Redis | Beanis | Overhead | Reason              |
| ------------------ | --------- | ------ | -------- | ------------------- |
| Insert             | 0.45ms    | 0.49ms | +8%      | Pydantic validation |
| Get by ID          | 0.38ms    | 0.41ms | +8%      | Type conversion     |
| Range Query        | 0.52ms    | 0.56ms | +7%      | Index optimization  |
| Batch Insert (100) | 42ms      | 47ms   | +12%     | Validation batching |

The overhead pays for validation, serialization, and type safety you would otherwise write by hand.

### When not to use Beanis

Reach for something else when you have:

- Ultra-low latency requirements (under 1ms per operation)
- Simple key-value caching (use raw `redis-py`)
- A hard dependency on RedisJSON or RediSearch (use Redis OM)
- Prototyping with an unpredictable schema (start with raw Redis)

Beanis fits when you are building production APIs with complex data models, need type safety and validation, work on teams that value clean code, or are moving from MongoDB or Postgres but need Redis speed.

## Use cases

### E-commerce product catalog

```python
products = await Product.find(
    category="electronics",
    price__gte=100,
    price__lte=500,
    stock__gt=0
)
```

### Session management

```python
class Session(Document):
    user_id: str
    token: str
    expires_at: Indexed[datetime]

await Session.delete_many(expires_at__lt=datetime.now())
```

### Real-time leaderboards

```python
class Score(Document):
    player_id: Indexed[str]
    score: Indexed[int]
    achieved_at: datetime

top_players = await Score.find(score__gte=1000).sort('-score').limit(10)
```

## Migrating from raw Redis

You can migrate an existing Redis codebase incrementally without breaking production.

### Step 1: Identify your data models

Group your existing keys into documents:

```python
# Current Redis structure
# User:1 -> hash {name, email, age}
# User:2 -> hash {name, email, age}
# User:idx:email -> sorted set
# User:all -> set

class User(Document):
    name: str
    email: Indexed[str]
    age: int

    class Settings:
        key_prefix = "User"
```

### Step 2: Add validation gradually

Start with plain types, then tighten constraints:

```python
# Phase 1: just types
class Product(Document):
    name: str
    price: float
    stock: int

# Phase 2: add validation
class Product(Document):
    name: str = Field(min_length=1, max_length=200)
    price: float = Field(gt=0)
    stock: int = Field(ge=0)
```

### Step 3: Dual-write during migration

Run both systems in parallel while you build confidence:

```python
async def create_product_safe(data):
    product = Product(**data)
    await product.insert()

    # Keep writing to old Redis for rollback safety
    await redis_client.hset(
        f"Product:{product.id}",
        mapping=legacy_serialize(data)
    )

    return product

# Stop reading old keys after a week or two, stop dual-writing after a month
```

### Step 4: Verify data consistency

```python
async def verify_migration():
    old_keys = await redis_client.keys("Product:*")

    for key in old_keys:
        product_id = key.split(":")[1]

        old_data = await redis_client.hgetall(key)
        new_product = await Product.get(product_id)

        assert old_data['name'] == new_product.name
        assert float(old_data['price']) == new_product.price
```

## Patterns and best practices

### Caching with TTL

Beanis has no built-in TTL yet, so implement it in the model:

```python
class CachedResult(Document):
    query_hash: Indexed[str]
    result_data: dict
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        key_prefix = "Cache"

    async def is_expired(self, ttl_seconds: int = 300) -> bool:
        age = (datetime.now() - self.created_at).total_seconds()
        return age > ttl_seconds

async def get_with_cache(query: str, ttl: int = 300):
    query_hash = hashlib.md5(query.encode()).hexdigest()

    cached = await CachedResult.find_one(query_hash=query_hash)
    if cached and not await cached.is_expired(ttl):
        return cached.result_data

    result = await expensive_operation(query)
    await CachedResult(
        query_hash=query_hash,
        result_data=result
    ).insert()

    return result
```

### Optimistic locking

Guard against race conditions with a version number, or use a Redis transaction:

```python
class BankAccount(Document):
    account_number: str
    balance: Decimal
    version: int = 0

    async def withdraw(self, amount: Decimal):
        if self.balance < amount:
            raise InsufficientFunds()

        self.balance -= amount
        self.version += 1
        await self.save()

async def atomic_withdraw(account_id: str, amount: Decimal):
    async with redis_client.pipeline(transaction=True) as pipe:
        account = await BankAccount.get(account_id)
        if account.balance >= amount:
            account.balance -= amount
            await account.save()
```

### Batch operations

Fetch and insert in bulk instead of one call per item:

```python
# Slow: one query per item
products = []
for product_id in product_ids:
    product = await Product.get(product_id)
    products.append(product)

# Fast: batch fetch
products = await Product.find(
    id__in=product_ids
).to_list()

# Bulk insert uses a Redis pipeline internally
async def bulk_insert_products(product_data_list):
    products = [Product(**data) for data in product_data_list]
    for p in products:
        p.model_validate(p)
    await Product.insert_many(products)
```

### Denormalization

Redis favors denormalization, so copy fields you query often:

```python
class Order(Document):
    user_id: str
    items: list[dict]  # [{product_id, quantity, price}]

    total_amount: Decimal
    item_count: int
    user_email: str  # copied from User

    @classmethod
    async def create_order(cls, user: User, items: list):
        total = sum(item['price'] * item['quantity'] for item in items)

        order = cls(
            user_id=user.id,
            items=items,
            total_amount=total,
            item_count=len(items),
            user_email=user.email
        )
        await order.insert()
        return order

# Query orders by email without a join
expensive_orders = await Order.find(
    user_email="vip@example.com",
    total_amount__gte=1000
)
```

## Common pitfalls

### Over-indexing

Every indexed field creates a sorted set, so indexing everything bloats memory. Index only the fields you query on:

```python
class User(Document):
    name: str
    email: Indexed[str]  # frequent lookups
    age: int
    created_at: Indexed[datetime]  # time-range queries
    last_login: datetime
    status: Indexed[str]  # filter by active/inactive
    role: str
    department: str
    manager_id: str
    salary: Decimal  # sensitive, do not index
```

### Forgetting async/await

```python
# Wrong: missing await
user = User.get(user_id)

# Right
user = await User.get(user_id)

# Batch fetch instead of a loop of awaits
users = await User.find(id__in=user_ids).to_list()
```

### N+1 queries

```python
# N+1 queries
orders = await Order.find_all()
for order in orders:
    user = await User.get(order.user_id)  # one query per order
    print(f"{user.name}: ${order.total}")

# Denormalize (recommended for Redis)
class Order(Document):
    user_id: str
    user_name: str  # denormalized
    total: Decimal

# Or batch fetch the users once
orders = await Order.find_all()
user_ids = {order.user_id for order in orders}
users = {u.id: u for u in await User.find(id__in=user_ids)}
```

## Performance tuning

### Connection pooling

```python
import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool

pool = ConnectionPool.from_url(
    "redis://localhost",
    max_connections=50,
    decode_responses=True
)
client = redis.Redis(connection_pool=pool)

await init_beanis(database=client, document_models=[Product, User])
```

### Batch validation

```python
products_data = [...]  # 1000 products

from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor() as executor:
    validated = list(executor.map(
        lambda d: Product(**d),
        products_data
    ))

await Product.insert_many(validated)
```

### Filter in Redis, not in Python

```python
# Fetch everything then filter in Python
all_products = await Product.find_all()
cheap = [p for p in all_products if p.price < 100]

# Filter in Redis instead
cheap = await Product.find(price__lt=100)
```

## Getting started

```bash
pip install beanis
```

```python
from beanis import Document, Indexed, init_beanis
import redis.asyncio as redis

# 1. Define your model
class User(Document):
    username: str
    email: Indexed[str]
    score: Indexed[int] = 0

# 2. Initialize
client = redis.Redis(decode_responses=True)
await init_beanis(database=client, document_models=[User])

# 3. Use it
user = User(username="john", email="john@example.com")
await user.insert()

top_users = await User.find(score__gte=100)
```

Full documentation is at [andreim14.github.io/beanis](https://andreim14.github.io/beanis).

## Project status and roadmap

Current state:

- 150+ tests passing
- 56% code coverage
- Full CI/CD pipeline
- Documentation site

Roadmap:

- Relationship support (OneToOne, OneToMany)
- Aggregation pipeline
- Field-level encryption
- Connection pooling optimizations
- Query analytics and slow-query detection

## FAQ

### What is Beanis?

Beanis is an async object-document mapper for Redis. You define Pydantic v2 models, and Beanis maps them to Redis hashes, validates data, serializes and deserializes fields, and maintains indexes for queries.

### How is Beanis different from Redis OM?

Redis OM depends on the RedisJSON and RediSearch modules. Beanis runs on vanilla Redis with no modules, so it works on managed Redis instances and standard installs where those modules are not available.

### How much overhead does Beanis add over raw redis-py?

About 7% to 8% on single-document reads, writes, and range queries, and around 12% on batch inserts, measured over 10,000 operations. That cost covers validation, type conversion, and index maintenance.

### Does Beanis support async?

Yes. Beanis is async-first and built on `redis.asyncio`. Document operations such as `insert`, `get`, `find`, `update`, and `delete` are awaited.

### When should I not use Beanis?

Skip it for sub-1ms latency requirements, plain key-value caching, workloads that need RedisJSON or RediSearch, or throwaway prototypes with an unstable schema. In those cases raw `redis-py` or Redis OM is a better fit.

### How do I install Beanis?

Run `pip install beanis`. It requires Python with Pydantic v2 and `redis-py` (async client).

## Resources

- **PyPI:** [pypi.org/project/beanis](https://pypi.org/project/beanis/)
- **Code:** [github.com/andreim14/beanis](https://github.com/andreim14/beanis)
- **Docs:** [andreim14.github.io/beanis](https://andreim14.github.io/beanis)
- **Inspired by:** [Beanie](https://github.com/roman-right/beanie) by Roman Right
