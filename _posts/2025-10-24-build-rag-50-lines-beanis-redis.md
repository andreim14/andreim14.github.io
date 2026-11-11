---
layout: post
title: "Agentic RAG in 65 lines: LangGraph 1.2, Claude and Redis 8 vector sets"
date: 2025-10-24 08:00:00 +0000
last_modified_at: 2026-11-11 15:00:00
description: "A docs assistant that searches, cites its sources and remembers the user, in one 65-line Python file: LangGraph 1.2 create_agent, Claude Opus 5.5, Beanis 0.3 on Redis 8 vector sets (no Redis Stack) and local fastembed embeddings."
tags: python redis RAG vector-search semantic-search langgraph agents beanis embeddings
categories: tutorials
keywords: agentic RAG Python, LangGraph create_agent, LangGraph 1.2 RAG, Redis 8 vector sets, VSIM VADD, Redis vector search without RediSearch, Beanis vector_search, agent memory Redis, fastembed, Claude Opus 5.5 LangChain
author: Andrei Stefan Bejgu
---

At the end of this post you have one Python file, 65 lines of code, that turns any Markdown document into a chat assistant. It searches the document before answering, cites the passages it used as `[n]`, and remembers what you tell it about yourself across turns. The model plans the searches; Redis holds the passages, the vectors and the memory.

| | |
| --- | --- |
| Agent | LangGraph 1.2 via `langchain.agents.create_agent` (LangChain 1.4) |
| Model | Claude Opus 5.5 (`anthropic:claude-opus-5-5`), any tool-calling chat model works |
| Storage | [Beanis 0.3](https://github.com/andreim14/beanis) on **Redis 8**: documents in hashes, embeddings in a native vector set |
| Embeddings | [fastembed](https://github.com/qdrant/fastembed) `BAAI/bge-small-en-v1.5`, 384 dimensions, local CPU, no API key |
| Requirements | Python 3.10+, Redis 8.0+ (`docker run -p 6379:6379 redis:8` or `brew install redis`), `ANTHROPIC_API_KEY` |

Redis 8 ships **vector sets** (`VADD`, `VSIM`) in the core server. That is what makes this setup small: no Redis Stack, no RediSearch index to create, no separate vector database. Beanis stores each document as a hash and puts its embedding in a vector set, together with the document's short fields so you can filter a search.

## The whole program

```bash
pip install "beanis>=0.3" "langchain>=1.4" langchain-anthropic fastembed
```

```python
# rag.py
import asyncio
import re
import urllib.request
from typing import List

from fastembed import TextEmbedding
from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from langchain_core.tools import tool
from langgraph.checkpoint.memory import InMemorySaver
from redis.asyncio import Redis
from typing_extensions import Annotated

from beanis import Document, IndexedField, Memory, VectorField, init_beanis

DOCS = "https://raw.githubusercontent.com/andreim14/beanis/main/README.md"
embedder = TextEmbedding("BAAI/bge-small-en-v1.5")  # 384 dims, runs on CPU


def embed(text: str) -> List[float]:
    return next(iter(embedder.embed([text]))).tolist()


class Chunk(Document):
    text: str
    source: Annotated[str, IndexedField()]
    embedding: Annotated[List[float], VectorField(dimensions=384)]


def split(markdown: str, source: str):
    for section in re.split(r"\n(?=#{1,3} )", markdown):
        if len(section.strip()) > 80:
            text = section.strip()[:2000]
            yield Chunk(text=text, source=source, embedding=embed(text))


@tool
async def search_docs(query: str) -> str:
    """Search the documentation. Returns numbered passages; cite them as [n]."""
    hits = await Chunk.vector_search(embed(query), k=4)
    return "\n\n".join(f"[{i}] {c.text}" for i, (c, _) in enumerate(hits, 1))


async def build_agent(model, redis):
    await init_beanis(database=redis, document_models=[Chunk])
    await Chunk.delete_all()
    readme = urllib.request.urlopen(DOCS).read().decode()
    await Chunk.insert_many(split(readme, "beanis/README.md"))
    memory = Memory(redis, embed=embed, namespace="docs-bot")

    @tool
    async def remember(fact: str) -> str:
        """Save a lasting fact or preference about the user."""
        await memory.remember(fact, user_id="me")
        return "saved"

    @tool
    async def recall(query: str) -> str:
        """Look up what you know about the user."""
        return "\n".join(m.text for m, _ in await memory.recall(query, user_id="me"))

    return create_agent(
        model,
        tools=[search_docs, remember, recall],
        system_prompt="Answer questions about Beanis using search_docs and cite "
        "passages as [n]. Say so when the docs do not cover something. Use "
        "recall for the user's preferences and remember for new ones.",
        checkpointer=InMemorySaver(),  # keeps the conversation per thread_id
    )


async def main():
    agent = await build_agent(
        init_chat_model("anthropic:claude-opus-5-5"), Redis(decode_responses=True)
    )
    config = {"configurable": {"thread_id": "cli"}}
    while question := input("\nyou> ").strip():
        result = await agent.ainvoke(
            {"messages": [{"role": "user", "content": question}]}, config
        )
        print("bot>", result["messages"][-1].content)


if __name__ == "__main__":
    asyncio.run(main())
```

Run it with `python rag.py` and ask about the document. Point `DOCS` at your own Markdown to make it your assistant.

## How it works

<figure class="flow" aria-label="Agentic RAG with LangGraph and Redis 8 in four steps">
<ol>
<li><b>Index</b><span>split the Markdown by heading, embed each section, store it as a Beanis document</span></li>
<li><b>Plan</b><span>the LangGraph agent decides whether to search, recall, remember or answer</span></li>
<li><b>Retrieve</b><span>one <code>VSIM</code> call on the Redis 8 vector set returns the closest sections</span></li>
<li><b>Answer</b><span>Claude answers from the numbered passages and cites them as [n]</span></li>
</ol>
<figcaption>The model chooses when and what to search; the tools stay simple.</figcaption>
</figure>

**Agentic, not a fixed pipeline.** Classic RAG always retrieves once, then answers. Here retrieval is a tool. The model can search twice with different wording, skip searching for small talk, or look up your preferences first. `create_agent` builds the LangGraph loop for you (model, then tools, then model, until it answers), and `InMemorySaver` keeps each conversation by `thread_id`. Swap it for a persistent checkpointer when you deploy.

**Storage in one class.** `Chunk` is a Pydantic model. `IndexedField` puts `source` in a Redis set for exact lookups. `VectorField(dimensions=384)` stores the embedding in a Redis 8 vector set (HNSW, cosine, int8 quantization by default). `Chunk.vector_search(vector, k=4)` returns `(chunk, score)` pairs, best first, with the score between 0 and 1.

**Filters for free.** Every short field of a document travels with its vector, so with several sources you can narrow the search inside the same call:

```python
await Chunk.vector_search(embed(query), k=4, filter='.source == "beanis/README.md"')
```

**Memory that survives the session.** `Memory` keeps what the user said in Redis, scoped by namespace and user, and merges near-duplicates instead of piling up copies. The checkpointer remembers the current conversation; `Memory` remembers the user across conversations.

## What a run looks like

I tested the file with a scripted stand-in model that makes the same tool calls Claude would, so the indexing, retrieval and memory run for real against Redis 8.10:

```text
chunks indexed: 44

you> I deploy on Redis 8 in Docker
[remember] -> saved

you> How do I deploy?
[recall] -> I deploy on Redis 8 in Docker
```

The README splits into 44 sections; `remember` and `recall` round-trip through the vector set. With a real model, the final answer is written from those tool results.

## Same memory, as an MCP server

If your agent is Claude Code, Claude Desktop or any MCP client, you do not need the memory code at all. Beanis ships it as an MCP server. In Claude Code, install the plugin (it needs [uv](https://docs.astral.sh/uv/) and a Redis 8):

```bash
claude plugin marketplace add andreim14/beanis
claude plugin install beanis@beanis
```

Or register the server by hand, for any client:

```bash
pip install "beanis[mcp]"
claude mcp add beanis-memory --env REDIS_URL=redis://localhost:6379/0 -- beanis-mcp
```

The client gets four tools: `remember`, `recall`, `forget` and `recent`, with local embeddings and no API key. The same memory is on the command line, with JSON output, for scripts and agents that prefer a shell:

```bash
beanis doctor                                  # is this Redis ready?
beanis memory remember "We deploy on Tuesdays" --kind decision
beanis memory recall "when do we deploy?"
```

## Questions people ask

**Do I need Redis Stack or RediSearch for vector search?** Not any more. Redis 8.0+ has vector sets built in, and Beanis 0.3 uses them. Redis 7 and Valkey do not have them; Beanis tells you at startup instead of returning empty results.

**Why fastembed instead of an embedding API?** It runs locally on the CPU with a small ONNX model (bge-small, about 130 MB), so indexing costs nothing and works offline. Any function that turns text into a list of floats works: pass it as `embed`.

**Can I use a model other than Claude?** Yes. `init_chat_model` takes any provider LangChain supports, for example `"openai:..."` or `"ollama:..."`, as long as the model supports tool calling.

**How many documents can this handle?** Vector sets use HNSW, so search stays fast as the set grows. The limits you will hit first are memory (with the default int8 quantization a 384-dimension vector is 384 bytes plus the HNSW graph links, and the text sits in the hash) and ingest speed, which is bound by the embedding model.

**How do I keep the index fresh?** Re-run the ingest with stable ids (for example `Chunk(id=f"{source}#{n}", ...)`). Saving a document with an existing id replaces it and updates its vector.

Links: [Beanis on GitHub](https://github.com/andreim14/beanis) · [PyPI](https://pypi.org/project/beanis/) · [LangChain agents](https://docs.langchain.com/oss/python/langchain/agents) · [Redis vector sets](https://redis.io/docs/latest/develop/data-types/vector-sets/)
