---
layout: post
title: "Word Sense Linking: Making NLP Understand What You Really Mean"
date: 2025-10-27 08:00:00
description: "Our ACL 2024 paper introduces Word Sense Linking - automatic disambiguation that works on real text, not just sandboxed examples. Learn how to use it."
tags: nlp word-sense-disambiguation acl2024 research python transformers
categories: research
giscus_comments: true
related_posts: false
thumbnail: assets/img/wsl-thumbnail.png
keywords: word sense linking, word sense disambiguation, NLP, ACL 2024, transformers, lexical semantics
author: Andrei Stefan Bejgu
---

## TL;DR - Why You Should Care

**Word Sense Linking** automatically identifies ambiguous words in text and links them to their correct meanings. It's like having a semantic understanding layer for your NLP pipeline.

**Use it for:**

- 🔍 Better search results (know if "python" means programming or snake)
- 🤖 Smarter RAG systems (disambiguate before retrieval)
- 📊 Accurate knowledge graphs (entities with precise meanings)
- 🛡️ Context-aware content moderation

**Install and run in 3 lines:**

```python
from wsl import WSL
model = WSL.from_pretrained("Babelscape/wsl-base")
result = model("The bank can guarantee deposits will cover tuition.")
# Automatically knows: bank=financial institution, cover=pay for
```

---

## The Ambiguity Problem

Read this sentence:

> "The bank can guarantee deposits will eventually cover future tuition costs."

What does **"bank"** mean? Financial institution or riverbank?
What about **"cover"**? Pay for, or physically cover?

Humans get this instantly from context. But how do we teach machines to do the same?

## Our ACL 2024 Research

I'm excited to share our paper **"Word Sense Linking: Disambiguating Outside the Sandbox"**, published at **[ACL 2024](https://2024.aclweb.org/) (Findings)** - the Association for Computational Linguistics, the top venue in NLP research.

<div class="alert alert-info" role="alert" style="background-color: #cfe2ff !important; border: 2px solid #084298 !important; color: #084298 !important;">
<strong style="color: #084298 !important;">📄 Published at ACL 2024</strong><br>
<strong style="color: #084298 !important;">Authors:</strong> Andrei Stefan Bejgu, Edoardo Barba, Luigi Procopio, Alberte Fernández-Castro, Roberto Navigli<br>
<strong style="color: #084298 !important;">Affiliations:</strong> Babelscape & Sapienza University of Rome<br><br>
📄 <a href="https://aclanthology.org/2024.findings-acl.851/" style="color: #084298 !important; font-weight: bold;">Read the paper at ACL Anthology</a><br>
🤗 <a href="https://huggingface.co/Babelscape/wsl-base" style="color: #084298 !important;">Try the model on Hugging Face</a><br>
💻 <a href="https://github.com/Babelscape/WSL" style="color: #084298 !important;">Code on GitHub</a>
</div>

## What's Wrong with Traditional WSD?

**Word Sense Disambiguation (WSD)** has been around for decades. The benchmark scores look great. But when you try to actually use it in a real application, you hit a wall.

The problem? Traditional WSD operates in a sandbox. It assumes you've already done most of the hard work:

First, you need to manually identify which words in your text are ambiguous. In our example sentence, you'd have to mark "bank" and "cover" as words that need disambiguation. Already a problem - how do you know which words are ambiguous without understanding context?

Second, you need to provide candidate meanings. You have to tell the system "bank could mean: financial institution, riverbank, or slope" and "cover could mean: pay for, place over, include, or protect." Again, this assumes you already know what senses exist for each word.

Only then does WSD do its job - picking the right sense from your provided list.

It's like having a translator who needs you to first identify which words need translating, then give them a dictionary of possible translations, and only then they'll pick the right one. If you can do all that, you probably don't need the translator.

### A Concrete Example: WSD vs WSL

Let's see this in action with: _"The bank can guarantee deposits will cover tuition."_

**Traditional WSD requires:**

```python
# Input with pre-marked spans and candidates
{
    "text": "The bank can guarantee deposits will cover tuition.",
    "spans": [
        {"text": "bank", "start": 4, "end": 8},      # You mark this
        {"text": "cover", "start": 41, "end": 46}   # And this
    ],
    "candidates": {
        "bank": ["financial institution", "riverbank", "slope"],    # You provide these
        "cover": ["pay for", "place over", "include", "protect"]   # And these
    }
}
# WSD picks: bank → financial institution, cover → pay for
```

**WSL needs only:**

```python
# Just raw text!
text = "The bank can guarantee deposits will cover tuition."

# WSL automatically:
# 1. Identifies ALL ambiguous spans (bank, guarantee, deposits, cover, tuition)
# 2. Retrieves candidates from WordNet
# 3. Links each to correct sense
```

**The key difference:** WSD assumes you know what to disambiguate. WSL figures it out.

This makes WSL practical for real applications where you don't have annotated data or pre-identified spans.

## Introducing Word Sense Linking

Our solution: **Word Sense Linking (WSL)** removes these constraints.

WSL does two things automatically:

1. **Span Identification**: Finds which text spans need disambiguation
2. **Sense Linking**: Links them to the correct meaning from [WordNet](https://wordnet.princeton.edu/)

**No manual preprocessing. No candidate provision. Just real text in, meanings out.**

### State-of-the-Art Results

| Model                  | Precision | Recall    | F1        |
| ---------------------- | --------- | --------- | --------- |
| ConSeC (previous SOTA) | 80.4%     | 64.3%     | **71.5%** |
| **WSL (our model)**    | 75.2%     | **76.7%** | **75.9%** |

We achieve **4.4% improvement** on the ALL_FULL benchmark, with significantly better recall - we find more correct senses.

## Using WSL: It's Simple

The best part? We released it as an easy-to-use Python library.

### Installation

```bash
pip install git+https://github.com/Babelscape/WSL.git
```

### Basic Usage

```python
from wsl import WSL

# Load pre-trained model
wsl_model = WSL.from_pretrained("Babelscape/wsl-base")

# Disambiguate!
result = wsl_model("Bus drivers drive busses for a living.")
```

### Output

```python
WSLOutput(
    text='Bus drivers drive busses for a living.',
    spans=[
        Span(
            start=0, end=11,
            text='Bus drivers',
            label='bus driver: someone who drives a bus'
        ),
        Span(
            start=12, end=17,
            text='drive',
            label='drive: operate or control a vehicle'
        ),
        Span(
            start=18, end=24,
            text='busses',
            label='bus: a vehicle carrying many passengers'
        ),
        Span(
            start=31, end=37,
            text='living',
            label='living: the financial means whereby one lives'
        )
    ]
)
```

**Notice**: It automatically:

- Identified which spans need disambiguation ("Bus drivers", "drive", "busses", "living")
- Linked them to the correct [WordNet](https://wordnet.princeton.edu/) senses
- Provided human-readable definitions

## Real-World Applications

### 1. Search & Information Retrieval

**Query**: "python tutorial"

WSL disambiguates: Programming language? Or the snake?

```python
result = wsl_model("Looking for python tutorial")
# Identifies: "python: a high-level programming language"
```

Better search results, better user experience.

### 2. Content Moderation

Context-aware filtering:

```python
wsl_model("The wedding shooting was beautiful")
# "shooting: the act of making a photograph"

wsl_model("There was a shooting downtown")
# "shooting: the act of firing a projectile"
```

Same word, different meanings, different moderation actions.

### 3. RAG Systems Enhancement

Improve retrieval for RAG:

```python
from wsl import WSL

wsl_model = WSL.from_pretrained("Babelscape/wsl-base")

# User query with ambiguous terms
query = "What's the best bank for deposits?"

# Disambiguate before retrieval
result = wsl_model(query)

# Now you know it's about financial institutions
# Not riverbanks!
```

Better semantic understanding = better retrieval = better LLM responses.

### 4. Knowledge Graph Construction

Extract entities with precise meanings:

```python
text = "Apple released a new chip for their computers"

result = wsl_model(text)
# "Apple: a major American tech company" (not the fruit!)
# "chip: electronic equipment consisting of a small circuit" (not food!)
```

Build more accurate knowledge graphs automatically.

## How It Works (The Architecture)

WSL uses a **retriever-reader** architecture:

1. **Retriever**: Gets relevant sense candidates from WordNet based on the input text
2. **Reader**: Extracts spans from text and links them to retrieved senses

Both components are transformer-based and trained end-to-end.

The model learns to:

- Recognize which words/phrases are ambiguous
- Select the contextually appropriate sense
- Do this jointly, not in separate steps

## Comparison: WSL vs Traditional WSD

The key difference comes down to what you need to provide as input.

Traditional WSD needs you to do the hard parts first: identify ambiguous words, provide candidate senses, and prepare your text in a specific format. It then picks the right sense from your candidates. This works fine for academic benchmarks where everything is pre-annotated, but it's impractical for real applications where you're processing arbitrary text.

Word Sense Linking does all of that automatically. You throw raw text at it - anything from tweets to research papers - and it figures out which spans are ambiguous, retrieves candidate senses from WordNet, and links everything to the correct meanings. No preprocessing, no manual annotation, no candidate lists.

That's why we're seeing actual adoption in production systems. WSL doesn't require you to build annotation pipelines or maintain sense inventories. It just works on whatever text you have.

## A Complete Example

Let's disambiguate a complex sentence:

```python
from wsl import WSL

wsl_model = WSL.from_pretrained("Babelscape/wsl-base")

text = """
The bank can guarantee deposits will eventually
cover future tuition costs because they understand
the financial burden.
"""

result = wsl_model(text)

# Print identified spans with definitions
for span in result.spans:
    print(f"{span.text:20} → {span.label}")
```

**Output**:

```
bank                 → bank: a financial institution
guarantee            → guarantee: give surety or assume responsibility
deposits             → deposit: money given as security
cover                → cover: be sufficient to meet or pay for
tuition              → tuition: a fee paid for instruction
financial            → financial: involving or relating to money
burden               → burden: an onerous or difficult concern
```

**Every ambiguous term correctly disambiguated!**

## Integration Example: Enhanced Search

Here's how to use WSL to improve search:

```python
from wsl import WSL
from typing import List, Dict

class SemanticSearch:
    def __init__(self):
        self.wsl = WSL.from_pretrained("Babelscape/wsl-base")

    def understand_query(self, query: str) -> Dict:
        """Disambiguate query terms for better search"""
        result = self.wsl(query)

        return {
            "original_query": query,
            "disambiguated_terms": [
                {
                    "term": span.text,
                    "sense": span.label,
                    "start": span.start,
                    "end": span.end
                }
                for span in result.spans
            ]
        }

# Usage
search = SemanticSearch()
analysis = search.understand_query("Looking for python courses for machine learning")

print(analysis)
# Knows it's about programming, not snakes!
```

## Performance Considerations

**Model Size**: ~400MB (base model)
**Inference Speed**: ~100-200ms per sentence (GPU)
**Memory**: ~2GB GPU RAM

For production:

- Batch processing recommended
- Consider quantization for deployment
- Cache results for common queries

## Why This Matters

**Traditional WSD** achieved high benchmark scores but couldn't escape the lab.

**Word Sense Linking** makes lexical semantics practical:

1. **No preprocessing** - Works on raw text
2. **End-to-end** - One model does everything
3. **Production-ready** - Available on Hugging Face
4. **Open source** - Free to use (CC BY-NC-SA 4.0)

We're bridging the gap between **research and real-world applications**.

## The Research Team

This work was done in collaboration with:

- **Edoardo Barba** (Babelscape)
- **Luigi Procopio** (Sapienza University)
- **Alberte Fernández-Castro** (Sapienza University)
- **Roberto Navigli** (Babelscape & Sapienza University)

Presented at **ACL 2024** in Bangkok, Thailand.

## Try It Yourself

Ready to add semantic understanding to your NLP pipeline?

### Quick Start

```bash
# Install
pip install git+https://github.com/Babelscape/WSL.git

# Use
from wsl import WSL
model = WSL.from_pretrained("Babelscape/wsl-base")
result = model("Your text here")
```

### Resources

- **Paper**: [ACL Anthology](https://aclanthology.org/2024.findings-acl.851/)
- **Code**: [GitHub](https://github.com/Babelscape/WSL)
- **Models**: [Hugging Face](https://huggingface.co/Babelscape/wsl-base)
- **Dataset**: [Hugging Face Datasets](https://huggingface.co/datasets/Babelscape/wsl)

## What's Next?

We're working on:

- **Multilingual WSL** - Beyond English
- **Domain-specific models** - Medical, legal, technical text
- **Lightweight versions** - For edge deployment
- **Integration guides** - For popular NLP frameworks

## Conclusion

**Word Sense Linking** solves a decades-old problem: making word sense disambiguation practical.

No more sandboxes. No more manual preprocessing. Just **real text in, precise meanings out**.

Whether you're building search engines, content moderation systems, or RAG applications - understanding what words really mean in context is crucial.

And now it's as simple as:

```python
from wsl import WSL
model = WSL.from_pretrained("Babelscape/wsl-base")
result = model("Your ambiguous text here")
```

Give it a try and let me know what you build with it!

---

## Citation

If you use Word Sense Linking in your research or applications, please cite our paper:

```bibtex
@inproceedings{bejgu-etal-2024-wsl,
    title     = "Word Sense Linking: Disambiguating Outside the Sandbox",
    author    = "Bejgu, Andrei Stefan and
                 Barba, Edoardo and
                 Procopio, Luigi and
                 Fern{\'a}ndez-Castro, Alberte and
                 Navigli, Roberto",
    booktitle = "Findings of the Association for Computational Linguistics: ACL 2024",
    month     = aug,
    year      = "2024",
    address   = "Bangkok, Thailand",
    publisher = "Association for Computational Linguistics",
    url       = "https://aclanthology.org/2024.findings-acl.851/",
}
```

**Plain text citation:**

> Andrei Stefan Bejgu, Edoardo Barba, Luigi Procopio, Alberte Fernández-Castro, and Roberto Navigli. 2024. Word Sense Linking: Disambiguating Outside the Sandbox. In Findings of the Association for Computational Linguistics: ACL 2024, Bangkok, Thailand. Association for Computational Linguistics.

---

_Published at ACL 2024 (Findings) - Association for Computational Linguistics, Bangkok, Thailand_

_Built with ❤️ by Andrei Stefan Bejgu - AI Applied Scientist @ [SylloTips](https://syllotips.com)_
