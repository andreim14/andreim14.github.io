---
layout: post
title: "Word Sense Linking: Word Sense Disambiguation on Real Text (ACL 2024)"
date: 2025-10-27 08:00:00
description: "Word Sense Linking (WSL) is a model that finds the ambiguous words in raw text and links each to its correct WordNet sense, no pre-marked spans or candidate lists required. Published at ACL 2024 (Findings) by Babelscape and Sapienza. Includes the model, results, and Python usage."
tags: nlp word-sense-disambiguation acl2024 research python transformers
categories: research
giscus_comments: true
related_posts: true
thumbnail: assets/img/wsl-thumbnail.png
keywords: word sense linking, word sense disambiguation, WSD, NLP, ACL 2024, WordNet, transformers, lexical semantics, Babelscape
author: Andrei Stefan Bejgu
---

## TL;DR

**Word Sense Linking (WSL)** is a task and an open-source model that takes raw text and, in one pass, (1) finds which words and phrases are ambiguous and (2) links each to its correct sense in [WordNet](https://en.wikipedia.org/wiki/WordNet). Classic Word Sense Disambiguation (WSD) assumes someone has already marked the ambiguous spans and supplied candidate senses; WSL removes both assumptions, which is what makes it usable on real text.

- **Paper:** [Word Sense Linking: Disambiguating Outside the Sandbox](https://aclanthology.org/2024.findings-acl.851/), Findings of ACL 2024
- **Authors:** Andrei Stefan Bejgu, Edoardo Barba, Luigi Procopio, Alberte Fernández-Castro, Roberto Navigli (Babelscape and Sapienza University of Rome)
- **Model:** [Babelscape/wsl-base](https://huggingface.co/Babelscape/wsl-base) on Hugging Face
- **Code:** [github.com/Babelscape/WSL](https://github.com/Babelscape/WSL)
- **Result:** 75.9 F1 on the ALL_FULL benchmark, up from 71.5 for the previous state of the art

```python
from wsl import WSL

model = WSL.from_pretrained("Babelscape/wsl-base")
result = model("The bank can guarantee deposits will cover tuition.")
# bank  -> financial institution
# cover -> be sufficient to pay for
```

## The problem: ambiguity in ordinary text

Take one sentence:

> The bank can guarantee deposits will eventually cover future tuition costs.

Does **bank** mean a financial institution or a riverbank? Does **cover** mean "pay for" or "place over"? A reader resolves this from context without noticing. A machine has to be taught to, and for most NLP systems that step is either skipped or done badly.

## Why traditional WSD stayed in the lab

Word Sense Disambiguation has strong benchmark numbers, but the standard setup does most of the hard work before the model runs:

1. **You mark the ambiguous spans.** In the sentence above, you have to flag `bank` and `cover` yourself. That already requires understanding the sentence.
2. **You supply candidate senses.** You tell the system `bank` could be {financial institution, riverbank, slope} and `cover` could be {pay for, place over, include, protect}.
3. **Only then** does WSD pick a sense from your list.

In code, the classic WSD input looks like this:

```python
{
    "text": "The bank can guarantee deposits will cover tuition.",
    "spans": [
        {"text": "bank", "start": 4, "end": 8},     # you mark this
        {"text": "cover", "start": 41, "end": 46},  # and this
    ],
    "candidates": {
        "bank":  ["financial institution", "riverbank", "slope"],   # you provide these
        "cover": ["pay for", "place over", "include", "protect"],   # and these
    },
}
# WSD returns: bank -> financial institution, cover -> pay for
```

If you can already produce the spans and candidates, you have done the part that needs understanding. That is why WSD scores well on pre-annotated benchmarks but rarely ships in real pipelines.

## What Word Sense Linking changes

WSL takes only the text and does the rest:

```python
text = "The bank can guarantee deposits will cover tuition."
# WSL automatically:
#   1. finds the spans that need disambiguation
#   2. retrieves candidate senses from WordNet
#   3. links each span to the correct sense
```

Two jobs, one model, no manual preprocessing: **span identification** (which words need a sense) and **sense linking** (which WordNet sense is right in this context), trained jointly rather than as separate stages.

### Results

On the ALL_FULL benchmark, which evaluates the full task rather than the pre-annotated subset:

| Model                  | Precision | Recall   | F1       |
| ---------------------- | --------- | -------- | -------- |
| ConSeC (previous SOTA) | 80.4      | 64.3     | 71.5     |
| WSL (ours)             | 75.2      | **76.7** | **75.9** |

The gain is mostly in recall: WSL finds more of the senses that are actually present, because it is not limited to spans someone marked in advance.

## How it works

WSL uses a **retriever-reader** architecture, both transformer-based and trained end to end:

- **Retriever:** pulls relevant sense candidates from WordNet given the input text.
- **Reader:** extracts the spans and links each to one of the retrieved senses.

Doing span detection and sense selection jointly, rather than in sequence, is what lets the model work from raw text.

## Using WSL

```bash
pip install git+https://github.com/Babelscape/WSL.git
```

```python
from wsl import WSL

model = WSL.from_pretrained("Babelscape/wsl-base")
result = model("Bus drivers drive busses for a living.")
```

Output:

```python
WSLOutput(
    text="Bus drivers drive busses for a living.",
    spans=[
        Span(start=0,  end=11, text="Bus drivers", label="bus driver: someone who drives a bus"),
        Span(start=12, end=17, text="drive",       label="drive: operate or control a vehicle"),
        Span(start=18, end=24, text="busses",      label="bus: a vehicle carrying many passengers"),
        Span(start=31, end=37, text="living",      label="living: the financial means whereby one lives"),
    ],
)
```

The model chose the spans, retrieved candidates from WordNet, and returned human-readable definitions, all from the raw sentence.

## Where it is useful

**Search and retrieval.** Disambiguate the query before you match it.

```python
model("Looking for python tutorial")
# python: a high-level programming language  (not the snake)
```

**Content moderation.** The same token can be benign or not depending on sense.

```python
model("The wedding shooting was beautiful")   # shooting: making a photograph
model("There was a shooting downtown")         # shooting: firing a projectile
```

**RAG.** Resolving ambiguous query terms before retrieval improves what gets pulled into context, which improves the model's answer.

```python
model("What's the best bank for deposits?")
# bank: financial institution  ->  retrieve finance docs, not geography
```

**Knowledge graphs.** Extract entities with the right sense attached.

```python
model("Apple released a new chip for their computers")
# Apple: the technology company (not the fruit)
# chip:  a small integrated circuit (not food)
```

## Performance and deployment

- **Model size:** ~400 MB (base)
- **Latency:** ~100 to 200 ms per sentence on GPU
- **Memory:** ~2 GB GPU RAM

For production, batch inputs, consider quantization for deployment, and cache results for common queries.

## FAQ

**What is Word Sense Linking?**
A task and model that reads plain text, detects the words and phrases that carry an ambiguous meaning, and links each to its correct WordNet sense, without needing pre-marked spans or candidate lists.

**How is WSL different from Word Sense Disambiguation (WSD)?**
WSD assumes the ambiguous spans and their candidate senses are given as input, so it only ranks candidates. WSL performs span identification and sense linking itself, from raw text.

**Which model should I use?**
[Babelscape/wsl-base](https://huggingface.co/Babelscape/wsl-base) on Hugging Face. Load it with `WSL.from_pretrained("Babelscape/wsl-base")`.

**What sense inventory does it use?**
WordNet. The output labels are WordNet senses with their glosses.

**What language does it support?**
English at release. Multilingual coverage is ongoing work.

**What is the license?**
CC BY-NC-SA 4.0.

**Where was it published?**
Findings of the Association for Computational Linguistics: ACL 2024, Bangkok, Thailand.

## Resources

- **Paper:** [ACL Anthology](https://aclanthology.org/2024.findings-acl.851/)
- **Model:** [Hugging Face](https://huggingface.co/Babelscape/wsl-base)
- **Dataset:** [Hugging Face Datasets](https://huggingface.co/datasets/Babelscape/wsl)
- **Code:** [GitHub](https://github.com/Babelscape/WSL)

## Citation

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

Andrei Stefan Bejgu, Edoardo Barba, Luigi Procopio, Alberte Fernández-Castro, and Roberto Navigli. 2024. _Word Sense Linking: Disambiguating Outside the Sandbox._ In Findings of the Association for Computational Linguistics: ACL 2024, Bangkok, Thailand. Association for Computational Linguistics.
