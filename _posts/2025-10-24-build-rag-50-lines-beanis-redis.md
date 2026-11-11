---
layout: post
title: "How to build RAG retrieval on Redis with Beanis vector search"
date: 2025-10-24 08:00:00 +0000
last_modified_at: 2026-11-11 12:00:00
description: "Store text and embeddings in Redis Stack with the Beanis ODM, let it create the HNSW index, and retrieve the top-k passages for a RAG prompt. Complete async Python code."
tags: python redis RAG vector-search semantic-search beanis embeddings
categories: tutorials
giscus_comments: true
related_posts: true
keywords: Redis vector search Python, RAG with Redis, Beanis VectorField, RediSearch HNSW Python, find_by_vector_similarity, Redis Stack embeddings, jina-embeddings-v4
author: Andrei Stefan Bejgu
---

This tutorial builds the retrieval half of a RAG pipeline on Redis: a Beanis model with a `VectorField`, an ingest step that stores text plus embeddings, and a search function that returns the closest passages. At the end you have one Python file that you can point at your own documents and plug into any LLM prompt.

| | |
| --- | --- |
| Package | [`pip install beanis`](https://pypi.org/project/beanis/) (0.2.0) |
| Code | [beanis](https://github.com/andreim14/beanis) · [simple-rag example](https://github.com/andreim14/beanis-examples/tree/main/simple-rag) |
| Docs | [andreim14.github.io/beanis](https://andreim14.github.io/beanis/) |
| Requirements | Python 3.9+, Redis Stack (needs the RediSearch module for vector indexes), `transformers>=4.52` and `torch>=2.6` for the embedding model |

<figure class="flow" aria-label="RAG retrieval with Beanis in four steps">
<ol>
<li><b>Embed</b><span>turn each passage into a 1024-dim vector</span></li>
<li><b>Insert</b><span>Beanis writes the text and vector to a Redis hash</span></li>
<li><b>Search</b><span>KNN query on the HNSW index Beanis created at init</span></li>
<li><b>Fetch</b><span>load the matching documents and pass their text to the LLM</span></li>
</ol>
<figcaption>Beanis owns storage and the index. The embedding model and the LLM are yours to choose.</figcaption>
</figure>

## Minimal example

Start Redis Stack:

```bash
docker run -d -p 6379:6379 redis/redis-stack:latest
pip install beanis "transformers>=4.52" "torch>=2.6" peft torchvision pillow
```

Then save this as `rag.py` and run `python rag.py`:

```python
import asyncio
from typing import List

from redis.asyncio import Redis
from transformers import AutoModel
from typing_extensions import Annotated

from beanis import Document, VectorField, init_beanis
from beanis.odm.indexes import IndexManager

DIM = 1024

model = AutoModel.from_pretrained("jinaai/jina-embeddings-v4", trust_remote_code=True)


def embed(text: str, kind: str) -> List[float]:
    """kind is "passage" when indexing and "query" when searching."""
    vec = model.encode_text(
        texts=[text], task="retrieval", prompt_name=kind, truncate_dim=DIM
    )[0]
    return vec.tolist()


class KnowledgeBase(Document):
    text: str
    embedding: Annotated[List[float], VectorField(dimensions=DIM)]


async def search(redis_client, query: str, k: int = 3):
    results = await IndexManager.find_by_vector_similarity(
        redis_client=redis_client,
        document_class=KnowledgeBase,
        field_name="embedding",
        query_vector=embed(query, "query"),
        k=k,
    )
    hits = []
    for doc_id, score in results:
        doc = await KnowledgeBase.get(doc_id)
        if doc is not None:
            hits.append((score, doc.text))
    return hits


async def main():
    redis_client = Redis(decode_responses=True)
    # Creates the HNSW index idx:KnowledgeBase:vector if it does not exist
    await init_beanis(database=redis_client, document_models=[KnowledgeBase])

    for text in [
        "Redis keeps its whole dataset in memory.",
        "Beanis maps Pydantic models to Redis hashes.",
        "HNSW is a graph index for approximate nearest neighbour search.",
    ]:
        await KnowledgeBase(text=text, embedding=embed(text, "passage")).insert()

    for score, text in await search(redis_client, "How does approximate vector search work?"):
        print(f"{score:.3f}  {text}")

    await redis_client.close()


asyncio.run(main())
```

The `score` is the distance RediSearch returns for the KNN query. With the default `COSINE` metric, lower means closer.

## How to define a vector field

```python
embedding: Annotated[List[float], VectorField(dimensions=1024)]
```

`VectorField` takes these parameters, all with defaults except `dimensions`:

| Parameter | Default | Meaning |
| --- | --- | --- |
| `dimensions` | required | must equal the length of your embeddings |
| `algorithm` | `"HNSW"` | or `"FLAT"` for exact search on small sets |
| `distance_metric` | `"COSINE"` | or `"L2"`, `"IP"` |
| `m` | `16` | HNSW links per node |
| `ef_construction` | `200` | HNSW build-time candidate list size |

At `init_beanis()` Beanis runs `FT.CREATE idx:<ClassName>:vector` over hashes with the `<ClassName>:` prefix, using a `FLOAT32` vector field. If RediSearch is not available it prints a warning and continues, so check the output if search returns nothing.

## How to search and tune recall

```python
results = await IndexManager.find_by_vector_similarity(
    redis_client, KnowledgeBase, "embedding", query_vector, k=5, ef_runtime=100
)
```

It returns a list of `(document_id, score)` tuples. `ef_runtime` is passed to the HNSW query: larger values search more of the graph, which raises recall and costs time. If the search itself fails (for example, the index does not exist), the function logs a warning and returns `[]`.

## How to use the results in a RAG prompt

Retrieval gives you passages. Build the prompt with any LLM client:

```python
hits = await search(redis_client, question, k=3)
context = "\n\n".join(text for _, text in hits)
prompt = f"Answer using only this context:\n\n{context}\n\nQuestion: {question}"
```

For a full agent with conversation memory, see [the LangGraph tutorial]({% post_url 2025-11-11-build-ai-agents-langgraph-beanis %}).

## How to filter by metadata

Beanis does not combine a vector query and a field filter in one Redis command. Add an indexed field and intersect in Python:

```python
from beanis import Indexed

class KnowledgeBase(Document):
    text: str
    language: Indexed(str)
    embedding: Annotated[List[float], VectorField(dimensions=1024)]

results = await IndexManager.find_by_vector_similarity(
    redis_client, KnowledgeBase, "embedding", query_vector, k=50
)
docs = [await KnowledgeBase.get(doc_id) for doc_id, _ in results]
english = [d for d in docs if d is not None and d.language == "en"][:5]
```

Ask for a larger `k` than you need, since some hits will be filtered out. For a large filtered subset, `await KnowledgeBase.find(language="en")` gives you the matching documents directly.

## Choosing an embedding model

The example uses [jina-embeddings-v4](https://huggingface.co/jinaai/jina-embeddings-v4), as the [simple-rag example](https://github.com/andreim14/beanis-examples/tree/main/simple-rag) does. Its vectors are 2048-dimensional by default; `truncate_dim=1024` keeps them at 1024. It is built on Qwen2.5-VL-3B, so a GPU helps, and its license is the Qwen Research License, so check it before commercial use. Any other model works: set `dimensions` to its output size and embed queries and documents with the same model.

## Questions people ask

**Do I need Redis Stack for vector search?**
Yes. The vector index is a RediSearch index (`FT.CREATE`), so you need Redis Stack or another Redis build with RediSearch. Beanis's other features run on plain Redis.

**Can I use OpenAI embeddings instead of Jina?**
Yes. Set `VectorField(dimensions=1536)` for `text-embedding-3-small`, and use the same model for documents and queries.

**When is the vector index created?**
During `init_beanis()`, not on the first insert. Beanis skips creation if the index already exists.

**How do I delete a document from the index?**
Call `await doc.delete_self()` or `await KnowledgeBase.delete(doc_id)`. RediSearch drops a hash from its index when the hash is deleted.

**Why does search return nothing?**
Check that the first `init_beanis()` run printed `Created vector index` (later runs find the index and print nothing), that `dimensions` matches your embedding length, and that queries use the same model as the documents.

## Links

- PyPI: [pypi.org/project/beanis](https://pypi.org/project/beanis/)
- GitHub: [github.com/andreim14/beanis](https://github.com/andreim14/beanis)
- Docs: [andreim14.github.io/beanis](https://andreim14.github.io/beanis/)
- Example: [beanis-examples/simple-rag](https://github.com/andreim14/beanis-examples/tree/main/simple-rag)
- Redis vector search: [redis.io docs](https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/)
