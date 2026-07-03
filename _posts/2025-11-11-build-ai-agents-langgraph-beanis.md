---
layout: post
title: "Stateful AI Agents with LangGraph and Beanis: RAG with Persistent Memory on Redis"
date: 2025-11-11 08:00:00
description: "A tutorial on building a stateful RAG agent with LangGraph for orchestration and Beanis for persistent memory and vector search, all backed by Redis, in about 200 lines of Python."
tags: python langgraph beanis redis rag vector-search
categories: tutorials
giscus_comments: true
related_posts: true
thumbnail: assets/img/langgraph-beanis.png
keywords: LangGraph, Beanis, Redis, AI agents, RAG, vector search, conversation memory, agent orchestration, stateful agents
author: Andrei Stefan Bejgu
---

## TL;DR

A **stateful RAG agent** is an agent that retrieves documents, remembers past turns, and keeps its state across restarts instead of starting fresh on every request. This tutorial builds one with [LangGraph](https://langchain-ai.github.io/langgraph/) for orchestration and [Beanis](https://andreim14.github.io/beanis/), a Redis-backed ODM with vector search, for memory and storage.

- **Stack:** LangGraph (workflow graph) + Beanis (Redis ODM + vector search) + OpenAI (embeddings and generation)
- **What it does:** ingests documents, stores embeddings in Redis, retrieves context by semantic search, keeps conversation history, generates answers
- **Data:** 100 passages from the [SQuAD dataset](https://huggingface.co/datasets/rajpurkar/squad)
- **Size:** about 200 lines of Python
- **Code:** [github.com/andreim14/beanis-examples](https://github.com/andreim14/beanis-examples/tree/main/langgraph-agent)
- **Docs:** [Beanis](https://andreim14.github.io/beanis/), [LangGraph](https://langchain-ai.github.io/langgraph/)

```
INPUT:  "How many students are at Notre Dame?"
OUTPUT: "In 2014, the Notre Dame student body consisted of 12,179 students."
        [Retrieved 3 relevant documents from 100 stored]
```

## The problem: agent state gets messy fast

A real agent, not just a single-turn chatbot, needs to remember conversations, search a knowledge base, and hold state across multiple steps.

The usual progression: you start with a script. Then you need conversation history, so you add a list. Then you need document search, so you add another structure. Then you need state to survive a restart, so you add a database. By the end, state management, database calls, and business logic are tangled together in the same functions.

The fix is to separate the two concerns. LangGraph owns the orchestration. Beanis owns the state and storage.

## Why LangGraph plus Beanis

**LangGraph** lets you define an agent workflow as a graph. Each step is a node, state flows between nodes, and you can visualize, debug, and modify the flow without rewriting everything.

**Beanis** is a Redis-backed ODM (Object Document Mapper) with built-in vector search. You store documents, embeddings, conversation history, and agent state in Redis through a Python API, with no manual serialization and no key management.

Together they give you stateful agents whose memory persists in Redis, which you are likely already running.

## What we are building

A RAG agent that:

- Ingests documents from the [SQuAD dataset](https://huggingface.co/datasets/rajpurkar/squad) (Stanford Question Answering Dataset)
- Stores them in Redis with vector embeddings
- Maintains conversation history across sessions
- Retrieves relevant context using semantic search
- Generates responses with OpenAI
- Orchestrates every step with LangGraph

The complete code is about 200 lines.

## Architecture

```
User Query
    ↓
┌─────────────────────────────────────┐
│         LangGraph Workflow          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  1. Retrieve Context        │   │
│  │     (Vector Search)         │   │
│  └────────────┬────────────────┘   │
│               ↓                     │
│  ┌─────────────────────────────┐   │
│  │  2. Load History            │   │
│  │     (From Redis)            │   │
│  └────────────┬────────────────┘   │
│               ↓                     │
│  ┌─────────────────────────────┐   │
│  │  3. Generate Response       │   │
│  │     (OpenAI + Context)      │   │
│  └────────────┬────────────────┘   │
│               ↓                     │
│  ┌─────────────────────────────┐   │
│  │  4. Save to History         │   │
│  │     (Persist in Redis)      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

Each node runs independently and state flows through the graph. If a node fails, you can retry it. To add a step, add a node and wire it up.

## Step 1: Define your data models

With Beanis you define models like Pydantic classes. The additions are vector fields and automatic indexing.

```python
from beanis import Document, VectorField
from typing import List
from typing_extensions import Annotated
from datetime import datetime

class KnowledgeDocument(Document):
    """Document with vector embeddings for RAG"""

    title: str
    context: str
    question: Optional[str] = None

    # Vector embedding (1536 dims for OpenAI text-embedding-3-small)
    # See: https://platform.openai.com/docs/guides/embeddings
    embedding: Annotated[List[float], VectorField(dimensions=1536)]

    source: str = "squad"
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "knowledge_docs"


class ConversationHistory(Document):
    """Conversation history for context-aware responses"""

    session_id: str
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    retrieved_docs: Optional[List[str]] = None

    class Settings:
        name = "conversations"
```

Beanis handles the rest:

- Serialization to Redis hashes
- Vector index creation (`GEOADD` under the hood)
- Type validation (via Pydantic)
- Async operations

## Step 2: Ingest data

Load data from the [SQuAD dataset](https://huggingface.co/datasets/rajpurkar/squad) and store it in Redis:

```python
from datasets import load_dataset
from langchain_openai import OpenAIEmbeddings
from beanis import init_beanis

async def ingest_data(api_key: str):
    # Connect to Redis
    redis_client = redis.Redis(host="localhost", port=6379, decode_responses=False)

    # Initialize Beanis (one line - handles all Redis indexes automatically)
    await init_beanis(database=redis_client, document_models=[KnowledgeDocument])

    # Load embeddings (using OpenAI's text-embedding-3-small model)
    # This model generates 1536-dimensional vectors optimized for semantic search
    # Alternatives: text-embedding-3-large (3072 dims), text-embedding-ada-002 (1536 dims)
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small", openai_api_key=api_key)

    # Load SQuAD dataset (100 Wikipedia passages about various topics)
    dataset = load_dataset("rajpurkar/squad", split="train")

    # Ingest documents
    for example in dataset.select(range(100)):  # First 100 for demo
        embedding = embeddings.embed_query(example["context"])

        doc = KnowledgeDocument(
            title=example["title"],
            context=example["context"],
            question=example["question"],
            embedding=embedding
        )

        await doc.insert()  # One line: saves to Redis + creates vector index
```

What Beanis removes here:

- **Manual Redis:** roughly 15 lines to construct keys, serialize embeddings to bytes, create the HNSW index with `FT.CREATE`, and handle errors
- **With Beanis:** one line, `await doc.insert()`
- Vector indexes are created on first insert, with no manual `FT.CREATE`
- Embeddings are serialized to FLOAT32 binary format automatically

Run it once and you have 100 documents with embeddings in Redis, ready for semantic search.

## Step 3: Build the LangGraph agent

```python
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage
from beanis.odm.indexes import IndexManager

class RAGAgent:
    def __init__(self, redis_client, openai_api_key: str):
        self.redis_client = redis_client
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=openai_api_key
        )
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            openai_api_key=openai_api_key
        )

        # Build the workflow graph
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Define the agent workflow"""

        workflow = StateGraph(RAGAgentState)

        # Define nodes (steps)
        workflow.add_node("retrieve_context", self._retrieve_context)
        workflow.add_node("load_history", self._load_conversation_history)
        workflow.add_node("generate_response", self._generate_response)
        workflow.add_node("save_history", self._save_conversation)

        # Define edges (flow)
        workflow.set_entry_point("retrieve_context")
        workflow.add_edge("retrieve_context", "load_history")
        workflow.add_edge("load_history", "generate_response")
        workflow.add_edge("generate_response", "save_history")
        workflow.add_edge("save_history", END)

        return workflow.compile()
```

Each node is a method and state flows through the graph. To add a fact-checking step, add a node between `generate_response` and `save_history`. To run multiple retrievers in parallel, set multiple entry points and combine results in a merge node.

## Step 4: Implement the nodes

### Vector search node

```python
async def _retrieve_context(self, state: RAGAgentState) -> RAGAgentState:
    """Retrieve relevant documents using vector similarity"""

    # Generate query embedding
    query_embedding = self.embeddings.embed_query(state["query"])

    # Search Redis using Beanis
    results = await IndexManager.find_by_vector_similarity(
        redis_client=self.redis_client,
        document_class=KnowledgeDocument,
        field_name="embedding",
        query_vector=query_embedding,
        k=3  # Top 3 results
    )

    # Fetch documents
    retrieved_texts = []
    doc_ids = []

    for doc_id, score in results:
        doc = await KnowledgeDocument.get(doc_id)
        if doc:
            retrieved_texts.append(f"Context: {doc.context}")
            doc_ids.append(str(doc.id))

    combined_context = "\n\n".join(retrieved_texts)

    return {
        **state,
        "retrieved_docs": doc_ids,
        "retrieved_context": combined_context
    }
```

Beanis issues the Redis `FT.SEARCH` commands for you. You call `find_by_vector_similarity` and get results back, with no manual index management and no raw Redis commands.

### Conversation history node

```python
async def _load_conversation_history(self, state: RAGAgentState) -> RAGAgentState:
    """Load recent conversation from Redis"""

    # Get last 5 messages for this session
    history_docs = await ConversationHistory.find_many(
        ConversationHistory.session_id == state["session_id"],
        sort=[("timestamp", -1)],
        limit=5
    )

    conversation_history = [
        {"role": doc.role, "content": doc.content}
        for doc in reversed(history_docs)
    ]

    return {**state, "conversation_history": conversation_history}
```

This is a Redis query behind an ORM-style API: filter by `session_id`, sort by timestamp, limit results, no manual key construction.

### Generation node

```python
async def _generate_response(self, state: RAGAgentState) -> RAGAgentState:
    """Generate response using LLM with context"""

    messages = [
        SystemMessage(content=f"""You are a helpful AI assistant.
Answer based on this context: {state["retrieved_context"]}""")
    ]

    # Add conversation history
    for msg in state.get("conversation_history", []):
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(SystemMessage(content=msg["content"]))

    # Add current query
    messages.append(HumanMessage(content=state["query"]))

    # Generate
    response = await self.llm.ainvoke(messages)

    return {**state, "final_response": response.content}
```

Standard LangChain generation, with state flowing through the graph.

### Persistence node

```python
async def _save_conversation(self, state: RAGAgentState) -> RAGAgentState:
    """Save conversation to Redis"""

    # Save user message
    user_msg = ConversationHistory(
        session_id=state["session_id"],
        role="user",
        content=state["query"]
    )
    await user_msg.insert()

    # Save assistant response
    assistant_msg = ConversationHistory(
        session_id=state["session_id"],
        role="assistant",
        content=state["final_response"],
        retrieved_docs=state.get("retrieved_docs", [])
    )
    await assistant_msg.insert()

    return state
```

Two inserts. Beanis handles serialization and timestamp generation.

## Step 5: Use the agent

```python
# Initialize
redis_client = redis.Redis(host="localhost", port=6379, decode_responses=False)
await init_beanis(
    database=redis_client,
    document_models=[KnowledgeDocument, ConversationHistory]
)

agent = RAGAgent(redis_client=redis_client, openai_api_key=api_key)

# Query
result = await agent.query(
    query="What universities are mentioned?",
    session_id="user-123"
)

print(result["response"])
# Output: "The university mentioned is the University of Notre Dame."
```

Examples from the SQuAD data:

```
INPUT:  "Tell me about education"
OUTPUT: "Education encompasses primary, secondary, and higher education levels.
         In formal education, structured systems prepare individuals for the
         workforce and promote social cohesion..."
        [Retrieved 3 documents, 530 queries/second]

INPUT:  "What year is mentioned?"
OUTPUT: "The year mentioned is 1879, specifically in the context of a fire
         that destroyed the Main Building and library collection."
        [Search took 1.89ms]

INPUT:  "How many students are there?"
OUTPUT: "In 2014, the Notre Dame student body consisted of 12,179 students."
        [Vector search: 27x faster than naive Python comparison]
```

On each query the agent retrieves docs from Redis by vector search, loads conversation history, generates a response with context, then saves everything back. State is persistent: restart the app and history is still there; run multiple instances and they share the same Redis.

## Why this approach works

### LangGraph

- **Visualizable workflow:** the agent logic is a graph you can draw, hand to a new teammate, or trace when debugging.
- **Easy to extend:** add a node for a fact-checking step, parallel entry points for multi-source retrieval, or conditional edges for branching logic.
- **Stateful by design:** LangGraph manages state flow between nodes, so no global variables and no dictionaries threaded through ten functions.
- **Error handling:** retry a failed node, and checkpoint state with built-in support.

### Beanis

**Fewer lines.** Compare the two paths:

```python
# Without Beanis (manual Redis):
# 1. Construct key manually
key = f"doc:{uuid.uuid4()}"

# 2. Serialize embedding to bytes
import struct
embedding_bytes = struct.pack(f"{len(embedding)}f", *embedding)

# 3. Create hash manually
await redis.hset(key, mapping={
    "title": title,
    "context": context,
    "embedding": embedding_bytes
})

# 4. Create vector index manually
await redis.execute_command(
    "FT.CREATE", "idx", "ON", "HASH", "PREFIX", "1", "doc:",
    "SCHEMA", "embedding", "VECTOR", "HNSW", "6",
    "TYPE", "FLOAT32", "DIM", "1536", "DISTANCE_METRIC", "COSINE"
)
# Total: ~15 lines per document type, error-prone

# With Beanis:
doc = KnowledgeDocument(title=title, context=context, embedding=embedding)
await doc.insert()
# Total: 2 lines, indexes created automatically
```

- **No key management:** you define models, Beanis generates the Redis keys and updates the right hash and indexes on write.
- **Vector search included:** call `find_by_vector_similarity` instead of writing raw `FT.SEARCH` commands.
- **Type safety:** Pydantic validation runs before data hits Redis.
- **Async native:** no blocking calls, no thread pools.
- **Just Redis:** no RedisJSON module required. Works with vanilla Redis or Redis Stack.

Together you get stateful agents with persistent memory, vector search, and clean orchestration, all backed by Redis.

## Real-world extensions

### Parallel retrieval

Run multiple search strategies at once:

```python
# Add multiple retrieval nodes
workflow.add_node("retrieve_semantic", self._retrieve_semantic)  # Vector search
workflow.add_node("retrieve_keyword", self._retrieve_keyword)    # Full-text search
workflow.add_node("combine_results", self._combine_results)

# Both run in parallel
workflow.set_entry_point("retrieve_semantic")
workflow.set_entry_point("retrieve_keyword")

# Merge results
workflow.add_edge("retrieve_semantic", "combine_results")
workflow.add_edge("retrieve_keyword", "combine_results")


async def _retrieve_keyword(self, state):
    """Full-text search using Redis FT.SEARCH"""
    # Beanis also supports full-text search on regular fields
    results = await KnowledgeDocument.find_many(
        KnowledgeDocument.context.contains(state["query"]),
        limit=3
    )
    return {**state, "keyword_results": results}

async def _combine_results(self, state):
    """Merge semantic + keyword results"""
    all_docs = state["retrieved_docs"] + state["keyword_results"]
    # Deduplicate and rerank
    unique_docs = list({doc.id: doc for doc in all_docs}.values())
    return {**state, "combined_docs": unique_docs[:5]}
```

LangGraph handles the parallel execution. A hybrid of semantic and keyword search often beats pure vector search, especially for technical terms and proper nouns. See [Redis full-text search](https://redis.io/docs/latest/develop/interact/search-and-query/query/).

### Conditional logic

Add decision points:

```python
def _should_search_web(self, state):
    """Decide if we need web search"""
    if not state["retrieved_context"]:
        return "web_search"
    return "generate_response"

workflow.add_conditional_edges(
    "retrieve_context",
    _should_search_web,
    {
        "web_search": "web_search",
        "generate_response": "generate_response"
    }
)
```

Routes based on state.

### Agent checkpointing

Save intermediate state:

```python
class AgentCheckpoint(Document):
    session_id: str
    current_step: str
    state_data: dict
    timestamp: datetime = Field(default_factory=datetime.now)

# Save after each node
async def _checkpoint_state(self, state):
    checkpoint = AgentCheckpoint(
        session_id=state["session_id"],
        current_step="generate_response",
        state_data=state
    )
    await checkpoint.insert()
```

Resume from any point.

## Performance notes

Benchmarked on an M1 Mac with 100 documents:

| Operation       | Time                           |
| --------------- | ------------------------------ |
| Vector search   | 10-20ms (Redis in-memory)      |
| History load    | 5ms (indexed by session_id)    |
| LLM call        | 500-800ms (OpenAI API latency) |
| Total per query | ~1 second                      |

The Redis operations are negligible; the LLM call is the bottleneck and is unavoidable.

**Memory:** about 4KB per document with embeddings. 100 docs is about 400KB, 10K docs is about 40MB. Redis handles millions.

## Common pitfalls

- **Forgetting to initialize Beanis.** Call `init_beanis()` once at app startup before using any document models.
- **Wrong embedding dimensions.** Your `VectorField(dimensions=...)` must match your embedding model. OpenAI `text-embedding-3-small` is 1536 dimensions.
- **Mixing sync and async.** Everything in Beanis and LangGraph is async. Use `await` and run inside `asyncio.run()`.
- **Loading too much history.** For long conversations, cap what you load. Passing 100 messages to the LLM is slow and expensive.
- **Vector search returning nothing.** Embed the query with the same model you used for the documents. A different model means a different vector space and no matches.

## Run it yourself

Full working example: [github.com/andreim14/beanis-examples/tree/main/langgraph-agent](https://github.com/andreim14/beanis-examples/tree/main/langgraph-agent)

```bash
git clone https://github.com/andreim14/beanis-examples.git
cd beanis-examples/langgraph-agent

# Install
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Start Redis
docker run -d -p 6379:6379 redis:latest

# Set API key
echo "OPENAI_API_KEY=your-key-here" > .env

# Ingest data
python ingest_data.py

# Run agent
python main.py
```

The example includes data ingestion from SQuAD, the full RAG agent with conversation memory, an interactive CLI, and a production-ready structure.

## When to use this stack

**Good fit:**

- You need stateful agents (conversation history, multi-step workflows)
- You want semantic search over documents
- You already use Redis, or are willing to
- You want to visualize and debug agent logic
- You need to scale horizontally

**Not a fit:**

- Simple single-turn Q&A (use LangChain directly)
- On-device embedding (Redis is server-side)
- Documents that do not fit in Redis memory (use a disk-based vector database)

## FAQ

**What is a stateful AI agent?**
It is an agent that persists its memory and working state, such as conversation history and retrieved context, across steps and restarts, rather than starting from scratch on each request.

**What is Beanis?**
Beanis is a Redis-backed ODM (Object Document Mapper) with built-in vector search. You define models like Pydantic classes, and it handles Redis serialization, key management, index creation, and vector similarity queries.

**How is LangGraph different from plain LangChain?**
LangGraph models an agent as a graph of nodes with explicit state flow, which makes multi-step and branching workflows easier to visualize, debug, and extend. Plain LangChain is a better fit for simple single-turn calls.

**Do I need Redis Stack or extra modules?**
No RedisJSON module is required. The stack works with vanilla Redis or Redis Stack, and Beanis creates the vector indexes for you on first insert.

**Which embedding model does this use?**
OpenAI `text-embedding-3-small`, which produces 1536-dimensional vectors. If you switch models, update `VectorField(dimensions=...)` to match and re-embed both documents and queries with the same model.

**How fast is it?**
On an M1 Mac with 100 documents, vector search runs in 10-20ms and history loads in about 5ms. The LLM call at 500-800ms dominates total latency of roughly one second per query.

**When should I not use this stack?**
Skip it for simple single-turn Q&A, when you need on-device embedding, or when your documents will not fit in Redis memory, in which case a disk-based vector database is a better fit.

## Resources

- **Beanis Documentation:** [andreim14.github.io/beanis](https://andreim14.github.io/beanis/)
- **LangGraph Documentation:** [langchain-ai.github.io/langgraph](https://langchain-ai.github.io/langgraph/)
- **LangChain Python:** [python.langchain.com](https://python.langchain.com/docs/introduction/)
- **Example code:** [github.com/andreim14/beanis-examples](https://github.com/andreim14/beanis-examples/tree/main/langgraph-agent)
- **Redis Vector Search:** [redis.io vector search docs](https://redis.io/docs/latest/develop/interact/search-and-query/query/vector-search/)
- **Redis Full-Text Search:** [redis.io query docs](https://redis.io/docs/latest/develop/interact/search-and-query/query/)
- **Redis HNSW Vectors:** [redis.io vector concepts](https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/)
- **OpenAI Embeddings Guide:** [platform.openai.com embeddings](https://platform.openai.com/docs/guides/embeddings)
- **SQuAD Dataset:** [huggingface.co/datasets/rajpurkar/squad](https://huggingface.co/datasets/rajpurkar/squad)
- **Hugging Face Datasets:** [huggingface.co/docs/datasets](https://huggingface.co/docs/datasets/)
- **Build RAG in 50 Lines with Redis + Beanis:** [related tutorial](/2025/10/24/build-rag-50-lines-beanis-redis.html)
- **Redis Geo-Spatial Caching:** [related tutorial](/2025/10/30/building-restaurant-finder-redis-geopoints.html)
