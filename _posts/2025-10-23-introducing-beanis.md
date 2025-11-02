---
layout: post
title: "Beanis: Stop Fighting Redis, Start Building with It"
date: 2025-10-23 23:00:00
description: "How I built a Redis ODM that makes working with Redis feel like magic - cutting boilerplate by 70% while keeping performance within 8% of raw Redis"
tags: python redis database odm pydantic open-source
categories: projects
giscus_comments: true
related_posts: false
thumbnail: assets/img/beanis-social.png
keywords: Redis ODM, Python Redis, Pydantic Redis, Redis object mapper, async Redis Python, Redis database Python, type-safe Redis, Redis serialization, Redis performance, Redis indexing
author: Andrei Stefan Bejgu
---

Picture this: You're building a high-performance API. You need Redis for caching and fast queries, but you're drowning in boilerplate code. Every simple operation requires 15-20 lines of manual serialization, type conversion, and key management. Your codebase is littered with `json.dumps()`, `json.loads()`, and fragile string manipulation.

**There had to be a better way.**

That's why I built [Beanis](https://github.com/andreim14/beanis) - a Redis ODM that brings the elegance of modern ORMs to Redis, without sacrificing the speed that makes Redis special.

## The "Aha!" Moment

I was working on a real-time recommendation system that needed to query thousands of products per second. Redis was the obvious choice for speed, but the code was becoming unmaintainable:

```python
# The old way - painful and error-prone
product_key = f"Product:{product_id}"
data = await redis.hgetall(product_key)

# Manual type conversion for EVERY field
product = {
    'name': data.get('name', ''),
    'price': float(data.get('price', 0)) if data.get('price') else 0.0,
    'stock': int(data.get('stock', 0)) if data.get('stock') else 0,
    'tags': json.loads(data.get('tags', '[]')),
    'metadata': json.loads(data.get('metadata', '{}')),
}

# And that's just reading ONE document!
```

I wanted to write code that looked like this instead:

```python
# The Beanis way - clean and type-safe
product = await Product.get(product_id)
```

**Spoiler: I made it happen.** And it's only 8% slower than raw Redis.

---

## Why Build Another Redis Library?

I've spent years working with databases in AI/ML projects. I love MongoDB's ODMs like Beanie - the clean API, Pydantic integration, and how they let you focus on business logic instead of CRUD boilerplate. But when you need Redis-level performance, you're stuck with manual serialization and key management.

**The existing Redis libraries weren't cutting it:**

- **Redis OM** - Excellent, but requires RedisJSON/RediSearch modules (not always available)
- **Walrus** - No async support, predates Pydantic v2
- **Raw redis-py** - Fast but verbose, no type safety

I wanted something that combined:

- ✅ Vanilla Redis compatibility (no modules required)
- ✅ Pydantic v2 validation and type safety
- ✅ Beanie-like clean API
- ✅ Async-first design
- ✅ Minimal performance overhead

When I couldn't find it, I built it. Beanis is what I wish existed when I started working with Redis.

---

## Real-World Example: Building a Product Catalog

Let's build something real: a product catalog for an e-commerce platform. You need:

- Fast lookups by ID
- Range queries on price
- Category filtering
- Real-time stock updates
- Audit trails

### Traditional Redis Approach

With raw redis-py, you'd write something like this for a single product insert:

```python
import json
import redis.asyncio as redis

async def create_product(redis_client, product_data):
    # Generate unique ID
    product_id = await redis_client.incr("product:id:counter")
    product_key = f"Product:{product_id}"

    # Manually serialize complex types
    redis_data = {
        'id': str(product_id),
        'name': product_data['name'],
        'price': str(product_data['price']),
        'category': product_data['category'],
        'stock': str(product_data['stock']),
        'tags': json.dumps(product_data.get('tags', [])),
        'metadata': json.dumps(product_data.get('metadata', {}))
    }

    # Save to hash
    await redis_client.hset(product_key, mapping=redis_data)

    # Manually maintain indexes for queries
    await redis_client.zadd(f"Product:idx:price", {product_key: product_data['price']})
    await redis_client.sadd(f"Product:idx:category:{product_data['category']}", product_key)
    await redis_client.sadd("Product:all", product_key)

    return product_id

# Query by price range - also manual
async def find_products_by_price(redis_client, min_price, max_price):
    keys = await redis_client.zrangebyscore(
        "Product:idx:price",
        min_price,
        max_price
    )

    products = []
    for key in keys:
        data = await redis_client.hgetall(key)
        # Manual deserialization for each product
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

**That's over 50 lines** for basic CRUD + one query. And we haven't even added:

- Input validation
- Error handling
- Type safety
- Audit trails
- Cascade deletes

### The Beanis Approach

Here's the same functionality with Beanis:

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

    # Audit fields - automatically managed
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

# Initialize once
client = redis.Redis(decode_responses=True)
await init_beanis(database=client, document_models=[Product])

# Create - with validation!
product = Product(
    name="MacBook Pro M3",
    price=2499.99,
    category="electronics",
    stock=50,
    tags={"laptop", "apple", "premium"},
    metadata={"warranty": "2 years", "color": "Space Gray"}
)
await product.insert()

# Query - indexes handled automatically
expensive = await Product.find(
    category="electronics",
    price__gte=1000,
    price__lte=3000
)

# Update - type-safe
await product.update(stock=45, price=2299.99)

# Complex queries
out_of_stock = await Product.find(stock=0)
premium_laptops = await Product.find(
    category="electronics",
    price__gte=2000
)
```

**That's about 30 lines** - including validation, audit trails, and automatic indexing. A **70% reduction** in code.

---

## What Makes Beanis Different?

### 🎯 Full Pydantic v2 Integration

Beanis isn't just wrapping Redis - it's bringing Pydantic's power to your data layer:

```python
from pydantic import EmailStr, HttpUrl, validator
from decimal import Decimal

class User(Document):
    email: EmailStr  # Automatic email validation
    username: str = Field(min_length=3, max_length=20, pattern="^[a-zA-Z0-9_]+$")
    age: int = Field(ge=13, le=120)
    website: Optional[HttpUrl] = None
    balance: Decimal = Decimal("0.00")

    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v.lower()

# This will raise validation errors BEFORE hitting Redis
try:
    user = User(
        email="not-an-email",  # ❌ Invalid
        username="ab",  # ❌ Too short
        age=200  # ❌ Too old
    )
except ValidationError as e:
    print(e)
```

### 🚀 Smart Indexing that Just Works

No more manually maintaining sorted sets and managing index consistency:

```python
class Article(Document):
    title: str
    views: Indexed[int]  # Sorted set automatically maintained
    published_at: Indexed[datetime]  # Time-based queries
    author: Indexed[str]  # Categorical filtering
    score: Indexed[float]  # Range queries

# All these queries use optimized indexes under the hood
trending = await Article.find(views__gte=10000)
recent = await Article.find(
    published_at__gte=datetime.now() - timedelta(days=7)
)
popular_by_author = await Article.find(
    author="john_doe",
    score__gte=4.5
)
```

**Behind the scenes**, Beanis:

- Maintains Redis sorted sets for each indexed field
- Automatically updates indexes on insert/update/delete
- Optimizes queries by choosing the best index
- Handles index cleanup when documents are deleted

### 🎨 Custom Encoders for Any Type

Working with complex types? Beanis has you covered:

```python
import numpy as np
from PIL import Image
from beanis.odm.custom_encoders import register_custom_encoder, register_custom_decoder

# NumPy arrays
@register_custom_encoder(np.ndarray)
def encode_numpy(arr: np.ndarray) -> str:
    return arr.tobytes().hex()

@register_custom_decoder(np.ndarray)
def decode_numpy(data: str, dtype=np.float32) -> np.ndarray:
    return np.frombuffer(bytes.fromhex(data), dtype=dtype)

# PIL Images
@register_custom_encoder(Image.Image)
def encode_image(img: Image.Image) -> str:
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()

class MLModel(Document):
    name: str
    weights: np.ndarray  # Seamlessly stored and retrieved
    bias: np.ndarray
    thumbnail: Image.Image

# It just works!
model = MLModel(
    name="sentiment-classifier",
    weights=np.random.rand(100, 50),
    bias=np.zeros(50)
)
await model.insert()
```

### 🌍 Geo-Spatial Queries Out of the Box

Building location-based features? We got you:

```python
from beanis import GeoPoint

class Restaurant(Document):
    name: str
    cuisine: Indexed[str]
    location: GeoPoint  # Lat/lon with automatic geo-indexing
    rating: Indexed[float]

# Find restaurants
italian_nearby = await Restaurant.find_near(
    location=GeoPoint(lat=41.9028, lon=12.4964),  # Rome, Italy
    radius=2000,  # 2km
    category="italian",
    rating__gte=4.0
)

# Get distance to each result
for restaurant in italian_nearby:
    distance = restaurant.location.distance_to(
        GeoPoint(lat=41.9028, lon=12.4964)
    )
    print(f"{restaurant.name}: {distance:.2f}m away")
```

### 🔄 Lifecycle Hooks for Business Logic

Implement audit trails, cache invalidation, or notifications:

```python
class Order(Document):
    user_id: str
    total: Decimal
    status: str = "pending"

    # Audit trail
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
        # Track status changes
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
        # Clean up related data
        await OrderItem.delete_many(order_id=self.id)
```

---

## Performance: Fast Enough for Production

I benchmarked Beanis against raw redis-py with 10,000 operations:

| Operation          | Raw Redis | Beanis | Overhead | Why?                |
| ------------------ | --------- | ------ | -------- | ------------------- |
| Insert             | 0.45ms    | 0.49ms | **+8%**  | Pydantic validation |
| Get by ID          | 0.38ms    | 0.41ms | **+8%**  | Type conversion     |
| Range Query        | 0.52ms    | 0.56ms | **+7%**  | Index optimization  |
| Batch Insert (100) | 42ms      | 47ms   | **+12%** | Validation batching |

**The verdict:** ~8% overhead for features you'd have to build anyway (validation, serialization, type safety).

### When NOT to Use Beanis

Be honest about trade-offs:

❌ **Ultra-low latency requirements** (< 1ms per operation)
❌ **Simple key-value caching** (use raw redis-py)
❌ **You need RedisJSON/RediSearch modules** (use Redis OM instead)
❌ **Prototyping with unpredictable schema** (use raw Redis first)

✅ **Building production APIs with complex data models**
✅ **Need type safety and validation**
✅ **Working with teams who value clean code**
✅ **Migrating from MongoDB/Postgres but need Redis speed**

---

## Real-World Use Cases

### E-Commerce Product Catalog

```python
# 10,000+ products, 1000+ queries/second
products = await Product.find(
    category="electronics",
    price__gte=100,
    price__lte=500,
    stock__gt=0
)
```

### Session Management

```python
class Session(Document):
    user_id: str
    token: str
    expires_at: Indexed[datetime]

# Auto-cleanup expired sessions
await Session.delete_many(expires_at__lt=datetime.now())
```

### Real-time Leaderboards

```python
class Score(Document):
    player_id: Indexed[str]
    score: Indexed[int]
    achieved_at: datetime

# Top 10 globally
top_players = await Score.find(score__gte=1000).sort('-score').limit(10)
```

---

## Migrating from Raw Redis: A Step-by-Step Guide

Already have a Redis codebase? Here's how to migrate incrementally without breaking production.

### Step 1: Identify Your Data Models

Look at your existing Redis keys and group them:

```python
# Current Redis structure
# User:1 -> hash {name, email, age}
# User:2 -> hash {name, email, age}
# User:idx:email -> sorted set
# User:all -> set

# This becomes a Beanis document
class User(Document):
    name: str
    email: Indexed[str]
    age: int

    class Settings:
        key_prefix = "User"
```

### Step 2: Add Validation Gradually

Start with basic types, add constraints later:

```python
# Phase 1: Just types
class Product(Document):
    name: str
    price: float
    stock: int

# Phase 2: Add validation
class Product(Document):
    name: str = Field(min_length=1, max_length=200)
    price: float = Field(gt=0)  # Must be positive
    stock: int = Field(ge=0)  # Can't be negative
```

### Step 3: Dual-Write During Migration

Run both systems in parallel:

```python
async def create_product_safe(data):
    # Write to Beanis
    product = Product(**data)
    await product.insert()

    # Still write to old Redis (for rollback safety)
    await redis_client.hset(
        f"Product:{product.id}",
        mapping=legacy_serialize(data)
    )

    return product

# After 1-2 weeks of dual-write, stop reading from old keys
# After 1 month, stop dual-writing
```

### Step 4: Verify Data Consistency

```python
async def verify_migration():
    """Compare old vs new data"""
    old_keys = await redis_client.keys("Product:*")

    for key in old_keys:
        product_id = key.split(":")[1]

        # Get from both systems
        old_data = await redis_client.hgetall(key)
        new_product = await Product.get(product_id)

        # Compare
        assert old_data['name'] == new_product.name
        assert float(old_data['price']) == new_product.price
        # ... verify all fields
```

---

## Advanced Patterns and Best Practices

### Pattern 1: Caching with TTL

Beanis doesn't have built-in TTL yet, but you can implement it:

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

# Usage
async def get_with_cache(query: str, ttl: int = 300):
    query_hash = hashlib.md5(query.encode()).hexdigest()

    # Check cache
    cached = await CachedResult.find_one(query_hash=query_hash)
    if cached and not await cached.is_expired(ttl):
        return cached.result_data

    # Compute and cache
    result = await expensive_operation(query)
    await CachedResult(
        query_hash=query_hash,
        result_data=result
    ).insert()

    return result
```

### Pattern 2: Optimistic Locking

Prevent race conditions with version numbers:

```python
class BankAccount(Document):
    account_number: str
    balance: Decimal
    version: int = 0

    async def withdraw(self, amount: Decimal):
        # Read current version
        original_version = self.version

        # Check balance
        if self.balance < amount:
            raise InsufficientFunds()

        # Update
        self.balance -= amount
        self.version += 1

        try:
            await self.save()
        except Exception:
            # In a real implementation, check if version changed
            # and retry or raise ConcurrentModificationError
            raise

# Better: Use Redis transactions
async def atomic_withdraw(account_id: str, amount: Decimal):
    async with redis_client.pipeline(transaction=True) as pipe:
        account = await BankAccount.get(account_id)
        if account.balance >= amount:
            account.balance -= amount
            await account.save()
```

### Pattern 3: Batch Operations for Performance

Process thousands of records efficiently:

```python
# ❌ Slow: One query per item
products = []
for product_id in product_ids:
    product = await Product.get(product_id)
    products.append(product)

# ✅ Fast: Batch fetch
products = await Product.find(
    id__in=product_ids
).to_list()

# ✅ Even faster: Pipeline for insertions
async def bulk_insert_products(product_data_list):
    products = [Product(**data) for data in product_data_list]

    # Validate all first (fails fast)
    for p in products:
        p.model_validate(p)

    # Bulk insert (uses Redis pipeline internally)
    await Product.insert_many(products)
```

### Pattern 4: Computed Fields and Denormalization

Redis favors denormalization - embrace it:

```python
class Order(Document):
    user_id: str
    items: list[dict]  # [{product_id, quantity, price}]

    # Denormalized fields for fast queries
    total_amount: Decimal
    item_count: int
    user_email: str  # Copied from User

    @classmethod
    async def create_order(cls, user: User, items: list):
        total = sum(item['price'] * item['quantity'] for item in items)

        order = cls(
            user_id=user.id,
            items=items,
            total_amount=total,
            item_count=len(items),
            user_email=user.email  # Denormalize for queries
        )
        await order.insert()
        return order

# Now you can query orders by email without joining
expensive_orders = await Order.find(
    user_email="vip@example.com",
    total_amount__gte=1000
)
```

---

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Over-Indexing

**Problem:** Every indexed field creates a sorted set. Too many = memory bloat.

```python
# ❌ Bad: 10 indexes = 10 sorted sets per document
class User(Document):
    name: Indexed[str]
    email: Indexed[str]
    age: Indexed[int]
    created_at: Indexed[datetime]
    last_login: Indexed[datetime]
    status: Indexed[str]
    role: Indexed[str]
    department: Indexed[str]
    manager_id: Indexed[str]
    salary: Indexed[Decimal]

# ✅ Good: Only index what you query
class User(Document):
    name: str
    email: Indexed[str]  # Frequent lookups
    age: int
    created_at: Indexed[datetime]  # Time-range queries
    last_login: datetime  # Don't need to query this
    status: Indexed[str]  # Filter by active/inactive
    role: str  # Can filter client-side
    department: str
    manager_id: str
    salary: Decimal  # Sensitive, don't index
```

### Pitfall 2: Forgetting Async/Await

```python
# ❌ This will fail silently or hang
user = User.get(user_id)  # Missing await!

# ✅ Always await
user = await User.get(user_id)

# ✅ Use async comprehensions
users = [await User.get(uid) for uid in user_ids]

# ✅ Even better: batch fetch
users = await User.find(id__in=user_ids).to_list()
```

### Pitfall 3: N+1 Query Problem

```python
# ❌ N+1 queries (slow!)
orders = await Order.find_all()
for order in orders:
    user = await User.get(order.user_id)  # N queries!
    print(f"{user.name}: ${order.total}")

# ✅ Denormalize (recommended for Redis)
class Order(Document):
    user_id: str
    user_name: str  # Denormalized
    total: Decimal

orders = await Order.find_all()
for order in orders:
    print(f"{order.user_name}: ${order.total}")  # No extra query!

# ✅ Or batch fetch users
orders = await Order.find_all()
user_ids = {order.user_id for order in orders}
users = {u.id: u for u in await User.find(id__in=user_ids)}

for order in orders:
    user = users[order.user_id]
    print(f"{user.name}: ${order.total}")
```

---

## Performance Tuning Tips

### 1. Use Connection Pooling

```python
import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool

# ✅ Reuse connections
pool = ConnectionPool.from_url(
    "redis://localhost",
    max_connections=50,
    decode_responses=True
)
client = redis.Redis(connection_pool=pool)

await init_beanis(database=client, document_models=[Product, User])
```

### 2. Batch Validation

```python
# If inserting many documents, validate in bulk
products_data = [...]  # 1000 products

# ✅ Validate all first (parallel)
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor() as executor:
    validated = list(executor.map(
        lambda d: Product(**d),
        products_data
    ))

# Then insert (uses pipeline automatically)
await Product.insert_many(validated)
```

### 3. Query Optimization

```python
# ❌ Fetching everything then filtering in Python
all_products = await Product.find_all()
cheap = [p for p in all_products if p.price < 100]

# ✅ Filter in Redis
cheap = await Product.find(price__lt=100)

# ✅ Use projections (when implemented)
# cheap = await Product.find(price__lt=100).project(['name', 'price'])
```

---

## Getting Started in 60 Seconds

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

# 3. Use it!
user = User(username="john", email="john@example.com")
await user.insert()

# Find users
top_users = await User.find(score__gte=100)
```

**Full documentation:** [andreim14.github.io/beanis](https://andreim14.github.io/beanis)

---

## What's Next?

Beanis is **production-ready today** with:

- ✅ 150+ tests passing
- ✅ 56% code coverage
- ✅ Full CI/CD pipeline
- ✅ Comprehensive docs

**Roadmap:**

- 🔄 Relationship support (OneToOne, OneToMany)
- 📊 Aggregation pipeline
- 🔐 Field-level encryption
- ⚡ Connection pooling optimizations
- 📈 Query analytics and slow query detection

---

## Try It, Star It, Break It

I built Beanis to scratch my own itch, and now I'm sharing it with the world. If you:

- Want cleaner Redis code
- Value type safety
- Need fast queries without the boilerplate

**Give Beanis a try:**

- 📦 PyPI: `pip install beanis`
- ⭐ GitHub: [github.com/andreim14/beanis](https://github.com/andreim14/beanis)
- 📚 Docs: [andreim14.github.io/beanis](https://andreim14.github.io/beanis)

Found a bug? Have a feature request? Open an issue - I read and respond to everything.

Happy coding! 🚀

---

_Beanis is inspired by [Beanie](https://github.com/roman-right/beanie) by Roman Right. Standing on the shoulders of giants._

_Built with ❤️ by Andrei Stefan Bejgu - AI Applied Scientist @ [SylloTips](https://syllotips.com)_
