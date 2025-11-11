---
layout: post
title: "Build Stateful AI Agents with LangGraph + Beanis: RAG with Memory in 200 Lines"
date: 2025-11-11 08:00:00
description: "Stop fighting with agent state management. Build production-ready AI agents with LangGraph for orchestration and Beanis for persistent memory and vector search - all backed by Redis"
tags: python langgraph beanis redis AI agents RAG vector-search state-management
categories: tutorials
giscus_comments: true
related_posts: false
thumbnail: assets/img/langgraph-beanis.png
keywords: LangGraph, Beanis, Redis, AI agents, RAG, state management, vector search, conversation memory, agent orchestration, Python AI, stateful agents
author: Andrei Stefan Bejgu
---

## The Problem: Agent State is a Mess

You're building an AI agent. Not just a simple chatbot - a real agent that needs to remember conversations, search through knowledge bases, and maintain state across multiple steps.

Here's what usually happens: You start with a simple script. Then you need conversation history. So you add a list. Then you need to search documents. So you add another data structure. Then you need to persist state across restarts. So you add a database. Then you realize your code is a tangled mess of state management, database calls, and business logic all mixed together.

Sound familiar?

## The Solution: LangGraph + Beanis

Here's a better approach: use [LangGraph](https://langchain-ai.github.io/langgraph/) for agent orchestration and [Beanis](https://andreim14.github.io/beanis/) for state management and vector storage.

**LangGraph** gives you a clean way to define agent workflows as graphs. Each step is a node. State flows between nodes. You can visualize it, debug it, and modify it without rewriting everything.

**Beanis** gives you a Redis-backed ODM (Object Document Mapper) with built-in vector search. Store documents, embeddings, conversation history, and agent state in Redis with a clean Python API. No manual serialization, no key management headaches.

Together? You get stateful AI agents that actually work in production.

## What We're Building

A RAG agent that:
- Ingests documents from [Hugging Face datasets](https://huggingface.co/datasets)
- Stores them in Redis with vector embeddings
- Maintains conversation history across sessions
- Retrieves relevant context using semantic search
- Generates responses using OpenAI
- Orchestrates everything with LangGraph

The complete code is ~200 lines. And it actually works.

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

Each node runs independently. State flows through the graph. If a node fails, you can retry it. Want to add a new step? Add a node and wire it up. No spaghetti code.

## Step 1: Define Your Data Models

With Beanis, you define models like Pydantic classes. The magic? Vector fields and automatic indexing.

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

That's it. Beanis handles:
- Serialization to Redis hashes
- Vector index creation (`GEOADD` under the hood)
- Type validation (via Pydantic)
- Async operations

## Step 2: Ingest Data

Load data from Hugging Face and store it in Redis:

```python
from datasets import load_dataset
from langchain_openai import OpenAIEmbeddings
from beanis import init_beanis

async def ingest_data(api_key: str):
    # Connect to Redis
    redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)

    # Initialize Beanis
    await init_beanis(database=redis_client, document_models=[KnowledgeDocument])

    # Load embeddings
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small", openai_api_key=api_key)

    # Load dataset
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

        await doc.insert()  # Saves to Redis, creates indexes
```

Run this once, and you've got 100 documents with embeddings in Redis, ready for semantic search.

## Step 3: Build the LangGraph Agent

Now for the interesting part - the agent workflow:

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

Clean, right? Each node is a method. State flows through the graph. Want to add a fact-checking step? Add a node between `generate_response` and `save_history`. Want to run multiple retrievers in parallel? Make multiple entry points and combine results in a merge node.

## Step 4: Implement the Nodes

### Vector Search Node

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

Beanis handles the Redis `FT.SEARCH` commands for you. You just call `find_by_vector_similarity` and get results. No manual index management, no raw Redis commands.

### Conversation History Node

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

This is just querying Redis, but Beanis makes it look like an ORM. Filter by session_id, sort by timestamp, limit results. Clean API, no manual key construction.

### Generation Node

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

Standard LangChain stuff. The key is that state flows naturally through the graph.

### Persistence Node

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

Two inserts. That's it. Beanis handles serialization, timestamp generation, everything.

## Step 5: Use the Agent

```python
# Initialize
redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)
await init_beanis(
    database=redis_client,
    document_models=[KnowledgeDocument, ConversationHistory]
)

agent = RAGAgent(redis_client=redis_client, openai_api_key=api_key)

# Query
result = await agent.query(
    query="What is machine learning?",
    session_id="user-123"
)

print(result["response"])
```

That's it. The agent:
1. Retrieves relevant docs from Redis (vector search)
2. Loads conversation history from Redis
3. Generates response with context
4. Saves everything back to Redis

All state is persistent. Restart your app? History is still there. Scale horizontally? Multiple instances share the same Redis.

## Why This Approach Works

### LangGraph Benefits

**Clear workflow visualization**: You can literally draw your agent's logic as a graph. New team member? Show them the graph. Debugging? Trace through the graph.

**Easy to extend**: Want to add a fact-checking step? Add a node. Want parallel retrieval from multiple sources? Add parallel entry points. Want conditional logic? Add conditional edges.

**Stateful by design**: LangGraph manages state flow between nodes. No global variables, no passing dictionaries through 10 functions.

**Error handling**: Node failed? Retry it. Want to checkpoint state? Built-in support.

### Beanis Benefits

**No key management**: You define models. Beanis generates Redis keys. Update a document? Beanis updates the right hash and indexes.

**Vector search included**: Other Redis libraries? You're writing raw `FT.SEARCH` commands. Beanis? Call `find_by_vector_similarity`.

**Type safety**: Pydantic validation on all fields. Try to insert invalid data? Fails before hitting Redis.

**Async native**: Everything is async. No blocking calls, no thread pools.

**Just Redis**: No RedisJSON module needed. No RediSearch setup (though it uses it). Works with vanilla Redis or Redis Stack.

### Together

You get stateful agents with persistent memory, vector search, and clean orchestration. All backed by Redis, which you're probably already running.

## Real-World Extensions

### Parallel Retrieval

Run multiple retrievers simultaneously:

```python
# Add multiple retrieval nodes
workflow.add_node("retrieve_semantic", self._retrieve_semantic)
workflow.add_node("retrieve_keyword", self._retrieve_keyword)
workflow.add_node("combine_results", self._combine_results)

# Both run in parallel
workflow.set_entry_point("retrieve_semantic")
workflow.set_entry_point("retrieve_keyword")

# Merge results
workflow.add_edge("retrieve_semantic", "combine_results")
workflow.add_edge("retrieve_keyword", "combine_results")
```

LangGraph handles parallel execution automatically.

### Conditional Logic

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

Route based on state.

### Agent Checkpointing

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

Restart from any point.

## Performance Notes

Benchmarked on M1 Mac with 100 documents:

- **Vector search**: 10-20ms (Redis in-memory)
- **History load**: 5ms (indexed by session_id)
- **LLM call**: 500-800ms (OpenAI API latency)
- **Total per query**: ~1 second

The Redis operations are negligible. The bottleneck is the LLM call, which is unavoidable.

**Memory**: ~4KB per document with embeddings. 100 docs = ~400KB. 10K docs = ~40MB. Redis can easily handle millions.

## Common Pitfalls

**Forgetting to initialize Beanis**: You need to call `init_beanis()` before using document models. Do it once at app startup.

**Wrong embedding dimensions**: Make sure your `VectorField(dimensions=...)` matches your embedding model. OpenAI text-embedding-3-small is 1536 dimensions.

**Not handling async properly**: Everything in Beanis and LangGraph is async. Use `await`, run in `asyncio.run()`, don't mix sync and async.

**Stale conversation history**: If your conversations get really long, limit what you load. Don't pass 100 messages to the LLM - it's expensive and slow.

**Vector search returning nothing**: Your query needs to be embedded with the same model you used for documents. Different model = different vector space = no matches.

## Try It Yourself

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

The example includes:
- Data ingestion from SQuAD dataset
- Full RAG agent with conversation memory
- Interactive CLI
- Production-ready structure

## When to Use This Stack

**Good fit:**
- You need stateful agents (conversation history, multi-step workflows)
- You want semantic search over documents
- You're already using Redis (or willing to)
- You want to visualize and debug agent logic
- You need to scale horizontally

**Not a fit:**
- Simple single-turn Q&A (just use LangChain directly)
- You need on-device embedding (Redis is server-side)
- Your documents don't fit in Redis memory (use a disk-based vector DB)

## The Bottom Line

Building stateful AI agents doesn't have to be messy. LangGraph gives you clean workflow orchestration. Beanis gives you persistent state and vector search with a clean API. Together, they let you build production-ready agents in a few hundred lines of code.

No manual state management. No key construction. No serialization headaches. Just define your workflow, define your models, and write your business logic.

Everything is on [GitHub](https://github.com/andreim14/beanis-examples/tree/main/langgraph-agent). The code works. Try it.

---

## Resources

- [Beanis Documentation](https://andreim14.github.io/beanis/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Redis Vector Similarity](https://redis.io/docs/latest/develop/interact/search-and-query/query/vector-search/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Hugging Face Datasets](https://huggingface.co/docs/datasets/)

---

_Built with ❤️ by Andrei Stefan Bejgu - AI Applied Scientist @ [SylloTips](https://syllotips.com)_
