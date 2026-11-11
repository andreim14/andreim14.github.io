---
layout: post
title: "How to build a LangGraph RAG agent with persistent memory in Redis (Beanis)"
date: 2025-11-11 08:00:00
last_modified_at: 2026-11-11 12:00:00
description: "A LangGraph agent that retrieves passages with Beanis vector search, keeps conversation history in Redis, and answers with an OpenAI model. Models, graph, nodes and entry point in complete Python."
tags: python langgraph beanis redis rag vector-search
categories: tutorials
giscus_comments: true
related_posts: true
keywords: LangGraph RAG agent, LangGraph Redis memory, conversation history Redis Python, Beanis VectorField, stateful agent Python, LangGraph StateGraph example, Redis Stack vector search
author: Andrei Stefan Bejgu
---

This tutorial builds a four-node LangGraph agent: it retrieves passages from Redis by vector search, loads the session's past turns, asks an LLM, and writes the new turns back. LangGraph runs the steps; Beanis stores the documents, embeddings and conversation history in Redis, so a restarted process picks up the same sessions.

| | |
| --- | --- |
| Package | [`pip install beanis`](https://pypi.org/project/beanis/) (0.2.0), `langgraph`, `langchain-openai`, `datasets` |
| Code | [beanis](https://github.com/andreim14/beanis) · [langgraph-agent example](https://github.com/andreim14/beanis-examples/tree/main/langgraph-agent) |
| Docs | [Beanis](https://andreim14.github.io/beanis/) · [LangGraph](https://langchain-ai.github.io/langgraph/) |
| Requirements | Python 3.9+, Redis Stack (RediSearch for the vector index), an OpenAI API key |

<figure class="flow" aria-label="The agent graph in four nodes">
<ol>
<li><b>retrieve</b><span>embed the question, KNN search in Redis, load top 3 passages</span></li>
<li><b>load_history</b><span>last turns for this session_id from Redis</span></li>
<li><b>generate</b><span>LLM call with passages, history and question</span></li>
<li><b>save</b><span>insert the user and assistant turns into Redis</span></li>
</ol>
<figcaption>Each node reads the shared state and returns the keys it changes.</figcaption>
</figure>

## Setup

```bash
docker run -d -p 6379:6379 redis/redis-stack:latest
pip install beanis langgraph langchain-openai datasets
export OPENAI_API_KEY=...
```

## Step 1: models (models.py)

```python
import time
from typing import List, Optional

from pydantic import Field
from typing_extensions import Annotated

from beanis import Document, Indexed, VectorField


class KnowledgeDocument(Document):
    title: str
    context: str
    # text-embedding-3-small returns 1536 dimensions
    embedding: Annotated[List[float], VectorField(dimensions=1536)]


class ConversationTurn(Document):
    session_id: Indexed(str)  # set index, so find(session_id=...) works
    role: str                 # "user" or "assistant"
    content: str
    ts: float = Field(default_factory=time.time)
    retrieved_docs: Optional[List[str]] = None
```

`ts` is a float on purpose: Beanis converts `int` and `float` fields back on read, which makes sorting turns simple.

## Step 2: ingest 100 SQuAD passages (ingest.py)

```python
import asyncio

from datasets import load_dataset
from langchain_openai import OpenAIEmbeddings
from redis.asyncio import Redis

from beanis import init_beanis
from models import KnowledgeDocument


async def main():
    redis_client = Redis(decode_responses=True)
    await init_beanis(database=redis_client, document_models=[KnowledgeDocument])

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    rows = load_dataset("rajpurkar/squad", split="train").select(range(100))

    for row in rows:
        vector = await embeddings.aembed_query(row["context"])
        await KnowledgeDocument(
            title=row["title"], context=row["context"], embedding=vector
        ).insert()

    await redis_client.close()


asyncio.run(main())
```

SQuAD repeats each context for several questions, so the 100 rows contain duplicate passages. Deduplicate on `context` if that matters to you.

## Step 3: the graph and its nodes (agent.py)

```python
import asyncio
from typing import List, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langgraph.graph import END, StateGraph
from redis.asyncio import Redis

from beanis import init_beanis
from beanis.odm.indexes import IndexManager
from models import ConversationTurn, KnowledgeDocument


class AgentState(TypedDict, total=False):
    query: str
    session_id: str
    history: List[dict]
    retrieved_docs: List[str]
    context: str
    answer: str


class RAGAgent:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        self.graph = self._build_graph()

    def _build_graph(self):
        g = StateGraph(AgentState)
        g.add_node("retrieve", self.retrieve)
        g.add_node("load_history", self.load_history)
        g.add_node("generate", self.generate)
        g.add_node("save", self.save)
        g.set_entry_point("retrieve")
        g.add_edge("retrieve", "load_history")
        g.add_edge("load_history", "generate")
        g.add_edge("generate", "save")
        g.add_edge("save", END)
        return g.compile()

    async def retrieve(self, state: AgentState) -> AgentState:
        vector = await self.embeddings.aembed_query(state["query"])
        results = await IndexManager.find_by_vector_similarity(
            redis_client=self.redis,
            document_class=KnowledgeDocument,
            field_name="embedding",
            query_vector=vector,
            k=3,
        )
        docs = [await KnowledgeDocument.get(doc_id) for doc_id, _ in results]
        docs = [d for d in docs if d is not None]
        return {
            "retrieved_docs": [d.id for d in docs],
            "context": "\n\n".join(d.context for d in docs),
        }

    async def load_history(self, state: AgentState) -> AgentState:
        turns = await ConversationTurn.find(session_id=state["session_id"])
        turns = sorted(turns, key=lambda t: t.ts)[-6:]  # last three exchanges
        return {"history": [{"role": t.role, "content": t.content} for t in turns]}

    async def generate(self, state: AgentState) -> AgentState:
        messages = [SystemMessage(
            content="Answer from this context. If it is not there, say so.\n\n"
            + (state.get("context") or "(no context found)")
        )]
        for turn in state.get("history", []):
            cls = HumanMessage if turn["role"] == "user" else AIMessage
            messages.append(cls(content=turn["content"]))
        messages.append(HumanMessage(content=state["query"]))
        reply = await self.llm.ainvoke(messages)
        return {"answer": reply.content}

    async def save(self, state: AgentState) -> AgentState:
        await ConversationTurn(
            session_id=state["session_id"], role="user", content=state["query"]
        ).insert()
        await ConversationTurn(
            session_id=state["session_id"], role="assistant",
            content=state["answer"], retrieved_docs=state.get("retrieved_docs", []),
        ).insert()
        return state

    async def query(self, query: str, session_id: str) -> AgentState:
        return await self.graph.ainvoke({"query": query, "session_id": session_id})


async def main():
    redis_client = Redis(decode_responses=True)
    await init_beanis(
        database=redis_client,
        document_models=[KnowledgeDocument, ConversationTurn],
    )
    agent = RAGAgent(redis_client)

    for question in ["Which university is the Main Building part of?",
                     "When was it built?"]:
        result = await agent.query(question, session_id="demo")
        print(question, "->", result["answer"])

    await redis_client.close()


asyncio.run(main())
```

Run `python ingest.py` once, then `python agent.py`. The second question only makes sense with the first turn in history, which is what the `load_history` node provides. Run the script again and the history from the previous run is still in Redis.

## How the memory is stored

Each turn is a Redis hash `ConversationTurn:<uuid>`. Its id is also added to the set `idx:ConversationTurn:session_id:<session_id>`, which is what `find(session_id=...)` reads. To drop a session:

```python
turns = await ConversationTurn.find(session_id="demo")
await ConversationTurn.delete_many([t.id for t in turns])
```

`delete_many` deletes the hashes in one pipeline but does not touch the index set, so also run `await redis_client.delete("idx:ConversationTurn:session_id:demo")`. To expire old sessions automatically instead, insert turns with `insert(ttl=...)`.

## How to extend the graph

- **Branching.** Use `add_conditional_edges("retrieve", route_fn, {...})` to skip generation or call another tool when `context` is empty.
- **More retrievers.** Add nodes that write to separate state keys and a merge node that combines them.
- **LangGraph checkpointing.** LangGraph has its own checkpointer interface for saving graph state between steps. The history model above covers the chat turns; a checkpointer covers in-flight graph state.

## Performance

The [example's README](https://github.com/andreim14/beanis-examples/tree/main/langgraph-agent) reports, for 100 documents on an M1 Mac, 10 to 20 ms for the Redis vector search and 500 to 800 ms per full query. Most of the time is the LLM call.

## Questions people ask

**Does LangGraph need Redis to keep memory?**
No. LangGraph has its own checkpointers. This post stores chat turns as Beanis documents so they are plain Redis hashes you can query, expire and inspect.

**Why is my conversation history empty?**
`session_id` must be declared `Indexed(str)`; `find()` only queries indexed fields and raises `ValueError` otherwise. Also check that the same `session_id` is passed on every call.

**Can I use a local embedding model instead of OpenAI?**
Yes. Change `VectorField(dimensions=...)` to the model's output size, re-ingest, and embed queries with the same model.

**Do I need Redis Stack or is plain Redis enough?**
The vector index uses RediSearch, so this agent needs Redis Stack. Conversation history alone would work on plain Redis.

## Links

- PyPI: [pypi.org/project/beanis](https://pypi.org/project/beanis/)
- GitHub: [github.com/andreim14/beanis](https://github.com/andreim14/beanis)
- Docs: [andreim14.github.io/beanis](https://andreim14.github.io/beanis/)
- Example: [beanis-examples/langgraph-agent](https://github.com/andreim14/beanis-examples/tree/main/langgraph-agent)
- Related: [RAG retrieval with Beanis]({% post_url 2025-10-24-build-rag-50-lines-beanis-redis %}) · [Geo search with Beanis]({% post_url 2025-10-30-building-restaurant-finder-redis-geopoints %})
