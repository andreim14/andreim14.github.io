---
layout: post
title: Introducing Beanis - A Modern Redis ODM for Python
date: 2024-10-23 23:00:00
description: Beanis is an async Python ODM (Object-Document Mapper) for Redis that gives you Pydantic models, type safety, and a clean API - while staying fast
tags: python redis database odm pydantic
categories: projects
giscus_comments: true
---

I'm excited to introduce **Beanis** - a Redis ODM (Object-Document Mapper) for Python that makes working with Redis as pleasant as working with any modern ORM.

## The Problem

If you've ever worked with Redis in Python, you know the pain:

- **Manual serialization** - Endless `json.dumps()` and `json.loads()` calls
- **Type conversions** - Strings from Redis need manual `float()`, `int()` conversions
- **Key management** - You track `"Product:123"`, `"all:Product"` keys manually
- **No validation** - Bad data silently corrupts your Redis database
- **Boilerplate code** - 15-20 lines for simple CRUD operations

## The Solution

Beanis wraps all this complexity behind a clean, Pydantic-based API:

```python
from beanis import Document, Indexed, init_beanis
from typing import Optional
import redis.asyncio as redis

class Product(Document):
    name: str
    description: Optional[str] = None
    price: Indexed[float]  # Automatic indexing for fast queries
    category: Indexed[str]
    stock: int = 0

    class Settings:
        key_prefix = "Product"

# Initialize
client = redis.Redis(decode_responses=True)
await init_beanis(database=client, document_models=[Product])

# Create
product = Product(
    name="Laptop",
    price=999.99,
    category="electronics",
    stock=50
)
await product.insert()

# Query with indexes
laptops = await Product.find(
    category="electronics",
    price__gte=500,
    price__lte=1500
)

# Update
await product.update(stock=45, price=899.99)

# Delete
await product.delete()
```

## Key Features

### ✅ Type Safety with Pydantic

Full Pydantic v2 support means you get validation, serialization, and IDE autocomplete out of the box:

```python
class User(Document):
    email: EmailStr  # Validated email
    age: int = Field(ge=0, le=150)  # Constrained integers
    tags: Set[str] = set()  # Complex types work

    @field_validator('email')
    def email_lowercase(cls, v):
        return v.lower()
```

### 🚀 Automatic Indexing

Just add `Indexed[T]` to your fields and Beanis handles Redis sorted sets for fast range queries:

```python
class Product(Document):
    price: Indexed[float]  # Automatic sorted set
    rating: Indexed[int]

# Fast range queries
expensive = await Product.find(price__gte=1000)
top_rated = await Product.find(rating__gte=4.5)
```

### 🎯 Event-Based Hooks

React to document lifecycle events:

```python
class AuditedDocument(Document):
    created_at: datetime
    updated_at: datetime

    @before_event(Insert)
    async def set_created_at(self):
        self.created_at = datetime.now()

    @before_event(Update)
    async def set_updated_at(self):
        self.updated_at = datetime.now()
```

### 🔧 Custom Encoders

Handle any type - even NumPy arrays:

```python
import numpy as np
from beanis import Document
from beanis.odm.custom_encoders import register_custom_encoder

@register_custom_encoder(np.ndarray)
def encode_numpy(value: np.ndarray) -> str:
    return value.tobytes().hex()

class MLModel(Document):
    weights: np.ndarray
    bias: np.ndarray
```

### 🌍 Geo-spatial Indexing

Built-in support for geo queries:

```python
from beanis import GeoPoint

class Store(Document):
    name: str
    location: GeoPoint  # Automatic geo-indexing

# Find stores within 5km
nearby = await Store.find_near(
    location=GeoPoint(lat=40.7128, lon=-74.0060),
    radius=5000
)
```

## Performance

Beanis is fast - only 8% overhead compared to raw Redis:

| Operation | Raw Redis | Beanis | Overhead |
|-----------|-----------|--------|----------|
| Insert | 0.45ms | 0.49ms | +8% |
| Find by ID | 0.38ms | 0.41ms | +8% |
| Range Query | 0.52ms | 0.56ms | +7% |

The overhead comes from Pydantic validation and type conversion - features you want in production!

## Why Beanis Over Alternatives?

**vs Redis OM:**
- ✅ Works with vanilla Redis (no RedisJSON/RediSearch required)
- ✅ Simpler, more Pythonic API
- ✅ Better Pydantic v2 support

**vs Raw redis-py:**
- ✅ 70% less code
- ✅ Type safety and validation
- ✅ No manual serialization

**vs Beanie (MongoDB):**
- ✅ Same beautiful API, but for Redis
- ✅ 10-100x faster queries (Redis in-memory)

## Getting Started

Install from PyPI:

```bash
pip install beanis
```

Check out the full documentation at [andreim14.github.io/beanis](https://andreim14.github.io/beanis/)

## What's Next?

Beanis is production-ready with:
- ✅ 150+ tests passing
- ✅ 56% code coverage
- ✅ Full CI/CD pipeline
- ✅ Comprehensive documentation

I'm working on:
- 🔄 Relationship support (OneToOne, OneToMany)
- 📊 Aggregation pipeline
- 🔐 Field-level encryption

## Try It Out!

Star the project on [GitHub](https://github.com/andreim14/beanis) and give it a try. I'd love to hear your feedback!

```bash
pip install beanis
```

Happy coding! 🚀

---

*Beanis is inspired by [Beanie](https://github.com/roman-right/beanie) - thank you to Roman Right for the excellent design patterns!*
