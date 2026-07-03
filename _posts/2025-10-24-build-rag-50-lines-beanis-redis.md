---
layout: post
title: "RAG with Redis and Beanis: Build Vector Search in ~50 Lines (No Separate Vector DB)"
date: 2025-10-24 08:00:00 +0000
description: "Build a RAG pipeline in about 50 lines of Python using Redis vector search and the Beanis ODM, without adding a separate vector database like Pinecone."
tags: python redis RAG vector-search semantic-search beanis embeddings
categories: tutorials
giscus_comments: true
related_posts: true
thumbnail: assets/img/rag-simple.png
keywords: RAG, Redis, vector search, Beanis, semantic search, embeddings, Pinecone alternative, Jina embeddings, HNSW
author: Andrei Stefan Bejgu
---

## TL;DR

**Beanis** is a Redis ODM (object-document mapper) with built-in vector search, so if you already run Redis you can build RAG (retrieval-augmented generation) without a dedicated vector database. You define a Pydantic-style model with a `VectorField`, Beanis creates the HNSW index automatically, and similarity search is one call.

- **What it replaces:** a separate vector service (Pinecone, Weaviate, pgvector) for small-to-mid corpora (roughly 10K to 1M documents).
- **Setup:** `redis-stack` (includes the RediSearch module) plus `pip install beanis transformers redis`.
- **Embeddings:** open-source [jina-embeddings-v4](https://huggingface.co/jinaai/jina-embeddings-v4), runs locally, no API key.
- **Code size:** about 50 lines total for ingest and search.
- **Docs:** [Beanis Documentation](https://andreim14.github.io/beanis/)
- **Example:** [Simple RAG](https://github.com/andreim14/beanis-examples/tree/main/simple-rag)

```python
# Define a model, ingest, and search
doc = KnowledgeBase(text=text, embedding=embedding)
await doc.insert()

results = await IndexManager.find_by_vector_similarity(
    redis_client, KnowledgeBase, "embedding", query_embedding, k=5
)
```

## The problem

You are building an AI app that needs semantic search for RAG. The common advice is to reach for [Pinecone](https://www.pinecone.io/) ($70/month minimum, plus 100+ lines of boilerplate), [Weaviate](https://weaviate.io/) (another service to deploy and monitor), or [pgvector](https://github.com/pgvector/pgvector) (slower queries and index tuning).

Meanwhile you already run Redis for caching, session storage, and job queues. What most people miss is that **Redis is also a vector database**. If you are already running it, the vector search capability is there whether you use it or not.

## The solution: Beanis on Redis

**Beanis** is a Redis ODM with built-in vector search. The whole RAG system is short:

```python
# models.py (14 lines)
from beanis import Document, VectorField
from typing import List
from typing_extensions import Annotated

class KnowledgeBase(Document):
    text: str
    embedding: Annotated[List[float], VectorField(dimensions=1024)]

    class Settings:
        name = "knowledge"

# ingest.py (20 lines)
from transformers import AutoModel

model = AutoModel.from_pretrained('jinaai/jina-embeddings-v4')

async def ingest_text(text: str):
    embedding = model.encode([text])[0].tolist()
    doc = KnowledgeBase(text=text, embedding=embedding)
    await doc.insert()

# search.py (15 lines)
from beanis.odm.indexes import IndexManager

async def search(query: str):
    query_emb = model.encode([query])[0].tolist()

    results = await IndexManager.find_by_vector_similarity(
        redis_client, KnowledgeBase, "embedding", query_emb, k=5
    )

    return [await KnowledgeBase.get(doc_id) for doc_id, score in results]
```

That is the entire RAG system.

## Why this approach works

Vector indexes are created automatically when you call `init_beanis()`. No manual Redis commands, no setup scripts. Define your model with `VectorField()` and Beanis handles the index.

### Beanis + Redis vs Pinecone

Pinecone is a good product, but it solves a problem you may not have. It makes sense for massive-scale search across billions of documents, global replication, and managed infrastructure with SLAs. If that is you, and you [have the budget](https://www.pinecone.io/pricing/), use Pinecone.

Most apps do not need that. You have maybe 10K to 1M documents, you already run Redis, and you would rather not add a monthly bill. Here is what changes with Beanis + Redis:

| Dimension     | Beanis + Redis                 | Pinecone          |
| ------------- | ------------------------------ | ----------------- |
| Setup         | `docker run`, no API keys      | Account, API keys |
| Code          | about 50 lines                 | 100+ lines        |
| Cost          | $0 if Redis is already running | from $70/month    |
| Query latency | 15ms (local)                   | 40ms (network)    |
| Operations    | one service                    | one more service  |

The trade-off is self-hosting. If managed infrastructure matters to you, stay on Pinecone. If you already run Redis and do not mind operating it, this is simpler and cheaper.

### The code comparison

**Pinecone:**

```python
# Setup
import pinecone
pinecone.init(api_key=os.getenv("PINECONE_API_KEY"), environment="us-west1-gcp")
index = pinecone.Index("my-index")

# Upsert (complex)
vectors = [(str(i), embedding, {"text": text}) for i, (text, embedding) in enumerate(docs)]
index.upsert(vectors=vectors, namespace="docs")

# Search (multiple steps)
query_response = index.query(
    vector=query_embedding,
    top_k=5,
    namespace="docs",
    include_metadata=True
)
results = [match['metadata']['text'] for match in query_response['matches']]

# ~100+ lines for production setup
```

**Beanis:**

```python
# Setup
doc = KnowledgeBase(text=text, embedding=embedding)
await doc.insert()

# Search
results = await IndexManager.find_by_vector_similarity(
    redis_client, KnowledgeBase, "embedding", query_embedding, k=5
)

# ~50 lines total
```

## Step-by-step tutorial

### 1. Install dependencies

```bash
pip install beanis transformers redis
```

Three packages, no account creation.

### 2. Start Redis

```bash
docker run -d -p 6379:6379 redis/redis-stack:latest
```

Use [`redis-stack`](https://redis.io/about/redis-stack/). It includes the RediSearch module needed for vector search.

### 3. Define your model

```python
from beanis import Document, VectorField
from typing import List
from typing_extensions import Annotated

class KnowledgeBase(Document):
    text: str
    embedding: Annotated[List[float], VectorField(dimensions=1024)]

    class Settings:
        name = "knowledge"
```

14 lines for the whole data model. `VectorField()` tells Beanis to create a vector index using the HNSW algorithm for fast similarity search.

### 4. Ingest documents

Vector indexes are created automatically, so there is no manual setup step.

```python
from transformers import AutoModel
import redis.asyncio as redis
from beanis import init_beanis

# Load open-source embedding model (no API key)
model = AutoModel.from_pretrained('jinaai/jina-embeddings-v4', trust_remote_code=True)  # https://huggingface.co/jinaai/jina-embeddings-v4

async def ingest_text(text: str):
    # Generate embedding
    embedding = model.encode([text])[0].tolist()

    # Store in Redis
    doc = KnowledgeBase(text=text, embedding=embedding)
    await doc.insert()

    print(f"✓ Indexed: {text[:50]}...")

# Initialize
redis_client = redis.Redis(decode_responses=True)
await init_beanis(database=redis_client, document_models=[KnowledgeBase])

# Ingest your documents
texts = ["Redis is fast", "Python is great", "Beanis is simple"]
for text in texts:
    await ingest_text(text)
```

20 lines. Documents are now searchable and the vector index was built for you.

### 5. Search semantically

```python
from beanis.odm.indexes import IndexManager

async def search(query: str, k: int = 5):
    # Embed query
    query_embedding = model.encode([query])[0].tolist()

    # Search
    results = await IndexManager.find_by_vector_similarity(
        redis_client=redis_client,
        document_class=KnowledgeBase,
        field_name="embedding",
        query_vector=query_embedding,
        k=k
    )

    # Get documents
    docs = []
    for doc_id, similarity_score in results:
        doc = await KnowledgeBase.get(doc_id)
        docs.append((doc.text, similarity_score))

    return docs

# Search
results = await search("what is semantic search?")
for text, score in results:
    print(f"{score:.3f}: {text}")
```

15 lines, semantic search working.

## Why semantic search beats keywords

Say you are building documentation search and a user asks "how to cancel my subscription?" while the docs use the phrase "termination policy". Keyword search returns nothing. Vector search matches on meaning, so it surfaces:

- "Account termination policy"
- "How to close your account"
- "Subscription cancellation process"

Vector embeddings encode meaning, not exact tokens, so related phrasing still matches.

## Performance comparison

I benchmarked this against the usual options with 10,000 documents. These are measured numbers, not marketing figures.

| System         | Query latency | Setup code | Setup            | Incremental cost       |
| -------------- | ------------- | ---------- | ---------------- | ---------------------- |
| Beanis + Redis | 15ms          | ~50 lines  | `docker run`     | $0                     |
| Pinecone       | 40ms          | 100+ lines | API key          | $70+/month             |
| Weaviate       | 35ms          | 80+ lines  | deploy a service | self-hosting           |
| pgvector       | 200ms         | 60+ lines  | index tuning     | included with Postgres |

Beanis wins on speed (local Redis beats API round trips) and on code size (the ODM pattern removes boilerplate). What you give up is managed infrastructure. If that matters, Pinecone is worth the cost.

## The "already using Redis" advantage

Most modern web apps already run Redis for caching, sessions, job queues, and rate limiting. Vector search joins that list on the same service, with the same monitoring and the same deployment pipeline.

Before:

- Redis (caching and sessions)
- PostgreSQL (user data)
- Pinecone (vectors, $70+/month)
- Your app

After:

- Redis (caching, sessions, and vectors)
- PostgreSQL (user data)
- Your app

One fewer service to monitor, deploy, and pay for. Vectors sit next to your cache, so queries benefit from data locality, and there is one less system to check when something breaks.

## Beyond basic text search

Once the basics work, a few extensions are worth knowing.

**Multimodal search.** [Jina v4](https://huggingface.co/jinaai/jina-embeddings-v4) embeds text and images into the same vector space, so you can search images with text queries or find text from an image. It is the same `model.encode()` API, plus `encode_image()` for images:

```python
from PIL import Image

# Search with text
text_emb = model.encode(["red sports car"])[0].tolist()
results = await IndexManager.find_by_vector_similarity(...)

# Search with image
img = Image.open("car.jpg")
img_emb = model.encode_image([img])[0].tolist()
results = await IndexManager.find_by_vector_similarity(...)
```

Both queries run against the same index.

**Hybrid search.** Combine vector similarity with traditional filters. Add indexed fields to your model and filter before or after the vector search:

```python
class KnowledgeBase(Document):
    text: str
    embedding: Annotated[List[float], VectorField(dimensions=1024)]
    category: Indexed(str)  # Filter by category
    date: datetime
    language: Indexed(str)  # Filter by language
```

This supports queries like "similar documents, but only in English" or "semantic search within the documentation category".

**Production tuning.** Redis Cluster handles sharding automatically, and you can tune HNSW parameters for your recall/speed trade-off:

```python
VectorField(
    dimensions=1024,
    algorithm="HNSW",
    m=32,  # More connections = better recall, more memory
    ef_construction=400  # Higher = better index quality, slower indexing
)
```

Start with the defaults and only tune if you see problems.

## Complete working example

Clone and run:

```bash
git clone https://github.com/andreim14/beanis-examples.git
cd beanis-examples/simple-rag

# Install
pip install -r requirements.txt

# Start Redis
docker run -d -p 6379:6379 redis/redis-stack:latest

# Ingest sample docs (vector indexes created automatically)
python ingest.py

# Search
python search.py "what is semantic search?"
```

## FAQ

### What is Beanis?

Beanis is a Redis ODM (object-document mapper) with built-in vector search. You define documents like Pydantic models, and it handles serialization, indexing, and vector similarity queries on Redis.

### Do I need RediSearch?

Yes. Use `redis-stack` (which includes the RediSearch module) or install RediSearch manually. Plain Redis does not have vector search.

### Can I use OpenAI embeddings instead of Jina?

Yes. Swap the embedding source and keep the rest of the pipeline:

```python
import openai
embedding = openai.Embedding.create(input=text, model="text-embedding-3-small")
```

The jina-embeddings-v4 model is free, runs locally, and needs no API key, which is why the tutorial uses it.

### How much data can Redis handle for vectors?

Redis can hold millions of vectors on a single node, and billions with sharding via Redis Cluster. Memory is roughly 4KB per document for 1024-dimension vectors, so about 4GB of RAM for 1M documents.

### How do updates and deletes work?

Edit the document and save, or delete it. Indexes update automatically:

```python
# Update
doc = await KnowledgeBase.get(doc_id)
doc.text = "Updated text"
doc.embedding = new_embedding
await doc.save()

# Delete
await doc.delete()
```

### When should I still use a dedicated vector database?

When you need billions of documents, global replication, or fully managed infrastructure with SLAs. For roughly 10K to 1M documents on infrastructure you already run, Beanis + Redis is simpler and cheaper.

### Is Beanis tied to a specific database?

No. It runs on Redis, so there is no proprietary lock-in. Your data and index live in a service you can host anywhere.

## Resources

- **Docs:** [Beanis Documentation](https://andreim14.github.io/beanis/)
- **Simple RAG example:** [GitHub](https://github.com/andreim14/beanis-examples/tree/main/simple-rag)
- **Restaurant Finder example:** [GitHub](https://github.com/andreim14/beanis-examples/tree/main/restaurant-finder)
- **Embedding model:** [jina-embeddings-v4](https://huggingface.co/jinaai/jina-embeddings-v4)
- **Redis Stack:** [redis-stack](https://redis.io/about/redis-stack/)
