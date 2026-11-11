---
layout: post
title: "Word Sense Linking: disambiguate word senses in raw text, no pre-marked spans (Findings of ACL 2024)"
date: 2025-10-27 08:00:00
last_modified_at: 2026-11-11 12:00:00
description: "Word Sense Linking (WSL) finds which words in a raw text need disambiguating and links each to its WordNet sense, in one forward pass. 75.9 F1 on the fully annotated benchmark against 71.5 for the best WSD system adapted to the task. How it works, how to run it, and how to cite it."
tags: nlp word-sense-disambiguation acl2024 research python transformers
categories: research
keywords: word sense linking, word sense disambiguation, WSD on raw text, WordNet, retriever-reader, sense inventory, lexical semantics, Findings of ACL 2024, Babelscape, Sapienza NLP
author: Andrei Stefan Bejgu
---

**Word Sense Linking (WSL)** is word sense disambiguation that works on plain text. Classic WSD needs someone to mark which words to disambiguate and to list each word's possible senses first. WSL takes the raw sentence and a sense inventory (WordNet) and does all three steps itself: it **finds the spans, retrieves the candidate senses, and picks the right one**, in a single forward pass.

| | |
|---|---|
| Paper | [Word Sense Linking: Disambiguating Outside the Sandbox](https://aclanthology.org/2024.findings-acl.851/), Findings of ACL 2024 |
| Authors | Andrei Stefan Bejgu, Edoardo Barba, Luigi Procopio, Alberte Fernández-Castro, Roberto Navigli (Babelscape, Sapienza University of Rome) |
| Model | [`Babelscape/wsl-base`](https://huggingface.co/Babelscape/wsl-base) · all resources in the [Hugging Face collection](https://huggingface.co/collections/Babelscape/word-sense-linking-66ace2182bc45680964cefcb) |
| Code | [github.com/Babelscape/WSL](https://github.com/Babelscape/WSL) |
| Headline result | 75.9 F1 on raw text, against 71.5 for ConSeC, the strongest WSD system adapted to the same setting |

## Run it

```bash
git clone https://github.com/Babelscape/WSL
cd WSL
pip install .
# if import fails with "No module named pkg_resources": pip install "setuptools<70"
```

```python
from wsl import WSL

model = WSL.from_pretrained("Babelscape/wsl-base")
model("Bus drivers drive busses for a living.")
```

```python
WSLOutput(
    text='Bus drivers drive busses for a living.',
    spans=[
        Span(start=0,  end=11, label='bus driver: someone who drives a bus', text='Bus drivers'),
        Span(start=12, end=17, label='drive: operate or control a vehicle', text='drive'),
        Span(start=18, end=24, label='bus: a vehicle carrying many passengers; used for public transport', text='busses'),
        Span(start=31, end=37, label='living: the financial means whereby one lives', text='living'),
    ],
)
```

You pass a sentence; you get back character offsets, the matched text and a WordNet gloss for every span the model decided to disambiguate. Note that it found the multiword *bus driver* on its own and that *living* got the "means of support" sense, not the "being alive" one.

## Why WSD needed a new task

State-of-the-art WSD systems score above the estimated inter-annotator agreement on the standard benchmarks, yet almost nobody uses them in real pipelines. The paper's argument is that the standard setup quietly assumes three things are given:

1. **A sense inventory** (for example WordNet). Unavoidable, and fine.
2. **The spans to disambiguate.** Someone already decided that *bank* and *cover* are the words that matter. On raw text, nobody did.
3. **The candidate senses for each span**, from a hand-built word-to-sense mapping. Such mappings are incomplete for most languages other than English.

WSL keeps (1) and drops (2) and (3). That is the setting of real applications such as machine translation, information extraction or retrieval: you have text and an inventory, nothing else.

## How it works

Pipelines that first find spans and then look up their senses have a chicken-and-egg problem: to know whether *bus drivers* is one span you need to know a sense *bus driver* exists. WSL flips the order.

<figure class="flow" aria-label="Word Sense Linking in two stages">
<ol>
<li><b>Text</b><span>Raw input, split into windows of 16 words with a stride of 8</span></li>
<li><b>Retriever</b><span>Dense retrieval (E5-base) ranks every WordNet sense against the window and keeps the top 100</span></li>
<li><b>Reader</b><span>DeBERTa-v3 reads the text and the 100 senses together, marks span starts and ends</span></li>
<li><b>Link</b><span>Each span is paired with its best-scoring sense, all spans in one forward pass</span></li>
</ol>
<figcaption>Candidate generation happens before span detection, so the reader chooses spans already knowing which senses are plausible.</figcaption>
</figure>

- **Retriever.** Each sense is turned into text (its lemmas plus its definition) and embedded once. The input window is embedded and the 100 closest senses become the candidates. It is trained with a contrastive objective using hard negatives, so similar-but-wrong senses get pushed away.
- **Reader.** The window and its 100 candidate senses are concatenated into one sequence. Start and end heads mark the spans; a third head matches each span to a candidate. Because the text tokens attend to the candidate senses, span detection is informed by what senses exist.
- **Speed.** Everything after retrieval is one encoder pass per window. On the standard WSD test set (7,253 instances) it runs in under 17 seconds, against 73 seconds for ConSeC on the same GPU.

## The benchmark and the results

You cannot measure precision on raw text if the gold data only annotates some of the words: a correct prediction on an unannotated word would count as a false positive. So the paper also releases a **fully annotated version of the standard WSD evaluation set**, taking it from 7,253 to 11,623 annotations so every content word is covered (inter-annotator agreement κ = 0.83).

<figure class="chart" role="img" aria-label="F1 when span detection is not given: WSL 75.9, ConSeC 71.5, BEM 68.0. When the word-to-sense mapping is reduced to one lemma or removed, WSL keeps 71.7 and 65.4 F1 while ConSeC drops to 63.1 and 0.">
<svg viewBox="0 0 680 236" width="100%" preserveAspectRatio="xMidYMid meet">
<g font-size="12"><rect x="190" y="10" width="12" height="12" rx="3" class="ch-a"/><text x="208" y="20">ConSeC (best WSD system, with heuristic span detection)</text><rect x="190" y="30" width="12" height="12" rx="3" class="ch-b"/><text x="208" y="40">Word Sense Linking</text></g>
<g><line x1="190" x2="190" y1="56" y2="214" class="ch-grid"/><line x1="306.5" x2="306.5" y1="56" y2="214" class="ch-grid"/><line x1="423" x2="423" y1="56" y2="214" class="ch-grid"/><line x1="539.5" x2="539.5" y1="56" y2="214" class="ch-grid"/><line x1="656" x2="656" y1="56" y2="214" class="ch-grid"/>
<text x="190" y="230" text-anchor="middle" class="ch-tick">0</text><text x="306.5" y="230" text-anchor="middle" class="ch-tick">25</text><text x="423" y="230" text-anchor="middle" class="ch-tick">50</text><text x="539.5" y="230" text-anchor="middle" class="ch-tick">75</text><text x="656" y="230" text-anchor="middle" class="ch-tick">100 F1</text></g>
<g class="ch-row"><title>All lemmas available: ConSeC 71.5, WSL 75.9</title><text x="176" y="84" text-anchor="end" class="ch-label">full word-to-sense map</text>
<rect x="190" y="62" width="333.2" height="16" rx="4" class="ch-a"/><text x="529" y="74" class="ch-val">71.5</text>
<rect x="190" y="80" width="353.7" height="16" rx="4" class="ch-b"/><text x="549" y="92" class="ch-val">75.9</text></g>
<g class="ch-row"><title>Only the most frequent lemma per sense: ConSeC 63.1, WSL 71.7</title><text x="176" y="136" text-anchor="end" class="ch-label">one lemma per sense</text>
<rect x="190" y="114" width="294.0" height="16" rx="4" class="ch-a"/><text x="490" y="126" class="ch-val">63.1</text>
<rect x="190" y="132" width="334.1" height="16" rx="4" class="ch-b"/><text x="530" y="144" class="ch-val">71.7</text></g>
<g class="ch-row"><title>No lemmas, definitions only: ConSeC 0.0 (no candidates), WSL 65.4</title><text x="176" y="188" text-anchor="end" class="ch-label">no mapping, glosses only</text>
<rect x="190" y="166" width="2" height="16" rx="1" class="ch-a"/><text x="198" y="178" class="ch-val">0.0, cannot run</text>
<rect x="190" y="184" width="304.8" height="16" rx="4" class="ch-b"/><text x="501" y="196" class="ch-val">65.4</text></g>
</svg>
<figcaption>F1 on raw text (no spans given), Tables 2 and 3 of the paper. With a weaker word-to-sense mapping, as in most languages other than English, WSL degrades gracefully; a classic WSD pipeline cannot even produce candidates.</figcaption>
</figure>

| Setting | System | Precision | Recall | F1 |
|---|---|---|---|---|
| Spans and candidates given (classic WSD, ALL) | ConSeC | | | 82.0 |
| | WSL | | | 80.2 |
| Raw text, spans not given | BEM + heuristic spans | 76.6 | 61.2 | 68.0 |
| | ConSeC + heuristic spans | 80.4 | 64.3 | 71.5 |
| | **WSL** | 75.2 | **76.7** | **75.9** |

- **The gain is recall.** WSL finds 92.1% of the gold spans; the best alternative span detector finds 80.6%. ConSeC is more precise on the spans it gets, but misses many more.
- **Classic WSD is not the bottleneck.** In the classic setting WSL is within 2 points of ConSeC while being about 4 times faster. Its advantage appears exactly when the sandbox assumptions are removed.
- **Training data matters.** SemCor, the standard training corpus, leaves many words unannotated. The paper fills them in (133,727 new annotations on top of 226,036), which helps WSL learn when *not* to skip a word.

## When to use it

- **Lexical features for search or RAG:** disambiguate query and document terms to WordNet senses before matching.
- **Information extraction and knowledge bases:** link content words to a sense inventory, not just named entities to Wikipedia.
- **Lower-resource settings:** the retriever does not depend on a word-to-sense mapping, so you can plug in an inventory with definitions but poor lemma coverage.
- **Linguistic analysis at scale:** sense-tagged corpora without manual pre-annotation.

The released model is English, trained on SemCor with WordNet senses. Other languages need a sense inventory with definitions and training data in that language.

## Questions people ask

**How is WSL different from WSD?** WSD picks a sense for spans someone already chose, from candidates someone already listed. WSL starts from the raw text and does span detection, candidate generation and disambiguation itself.

**How is it different from entity linking?** Entity linking connects names (*Paris*, *Barack Obama*) to an encyclopedia. WSL connects common words and multiword expressions (*bus driver*, *drive*, *living*) to the senses of a dictionary like WordNet. The architecture borrows the retriever-reader design from entity linking.

**Which sense inventory does it use?** WordNet (English). The retriever only needs a textual definition for each sense, so other inventories can be plugged in by re-indexing.

**Is the fully annotated evaluation set available?** Yes: [`Babelscape/wsl`](https://huggingface.co/datasets/Babelscape/wsl) on Hugging Face (dev and test splits). The retriever, reader and WordNet index are also released as separate models in the same collection.

## Cite

```bibtex
@inproceedings{bejgu-etal-2024-word,
    title = "Word Sense Linking: Disambiguating Outside the Sandbox",
    author = "Bejgu, Andrei Stefan and Barba, Edoardo and Procopio, Luigi and Fern{\'a}ndez-Castro, Alberte and Navigli, Roberto",
    booktitle = "Findings of the Association for Computational Linguistics: ACL 2024",
    month = aug,
    year = "2024",
    address = "Bangkok, Thailand",
    publisher = "Association for Computational Linguistics",
    url = "https://aclanthology.org/2024.findings-acl.851/",
    doi = "10.18653/v1/2024.findings-acl.851",
    pages = "14332--14347"
}
```

Paper: [ACL Anthology](https://aclanthology.org/2024.findings-acl.851/) · [PDF](https://aclanthology.org/2024.findings-acl.851.pdf) · Code: [Babelscape/WSL](https://github.com/Babelscape/WSL) · Model: [Babelscape/wsl-base](https://huggingface.co/Babelscape/wsl-base)
