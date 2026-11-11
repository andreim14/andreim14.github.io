---
layout: post
title: "LLM-Oasis: a large-scale dataset and benchmark for end-to-end factuality evaluation of LLM text (Computational Linguistics 2026)"
date: 2025-11-08 09:00:00
last_modified_at: 2026-11-11 12:00:00
description: "LLM-Oasis is built from 81,275 Wikipedia pages: 681,201 extracted claims and 81k pairs of factual and unfactual texts that differ by one subtle falsified claim. On its human-validated gold benchmark GPT-4o reaches 60.8% balanced accuracy zero-shot and 68.0% with retrieval; a 1B fine-tuned pipeline reaches 69.24%."
tags: llm-oasis factuality hallucination evaluation benchmark research dataset
categories: research
keywords: LLM-Oasis, factuality evaluation, end-to-end factuality evaluation, hallucination detection, fact-checking dataset, claim extraction, claim falsification, claim verification, FEVER alternative, Wikipedia, GPT-4o, balanced accuracy, Computational Linguistics, Babelscape, Sapienza NLP
author: Andrei Stefan Bejgu
---

**LLM-Oasis** is a resource for training and testing systems that decide whether a whole piece of text is factual, not just a single isolated claim. It is built from Wikipedia: each passage gets a paraphrased factual version and an unfactual version that differs by **one subtle falsified claim**, giving **81k ⟨factual, unfactual⟩ pairs** for training and a human-validated gold benchmark for testing. The task is hard: GPT-4o reaches **60.8% balanced accuracy** zero-shot and **68.0%** with retrieved Wikipedia evidence, where 50% is chance.

| | |
|---|---|
| Paper | [Truth or Mirage? Towards End-to-End Factuality Evaluation with LLM-Oasis](https://direct.mit.edu/coli/article/52/1/1/133509/Truth-or-Mirage-Towards-End-To-End-Factuality), Computational Linguistics 52(1):1–41, 2026 · [arXiv 2411.19655](https://arxiv.org/abs/2411.19655) |
| Authors | Alessandro Scirè\*, Andrei Stefan Bejgu\*, Simone Tedeschi, Karim Ghonim, Federico Martelli, Roberto Navigli (\* equal contribution). Babelscape and Sapienza University of Rome |
| Data | [Hugging Face collection](https://huggingface.co/collections/Babelscape/llm-oasis-674db6e4ff329619b8ed6b82): 4 training datasets (one per pipeline step) and the gold claim verification set, CC BY-NC-SA 4.0 |
| Code | [github.com/Babelscape/LLM-Oasis](https://github.com/Babelscape/LLM-Oasis) |
| Use it for | Training claim extractors, retrievers and claim verifiers; benchmarking LLMs as end-to-end factuality evaluators or as evidence-based claim verifiers |

## Use it

The public datasets are on the Hugging Face Hub under `Babelscape/`. Column names and split sizes below come from the Hub's dataset viewer API.

| Dataset | Columns | Splits |
|---|---|---|
| `LLM-Oasis_claim_extraction` | `title`, `text`, `claims` | train 67,426 · validation 13,849 |
| `LLM-Oasis_claim_falsification` | `title`, `text`, `factual_claim`, `unfactual_claim` | train 42,749 · validation 9,641 |
| `LLM-Oasis_paraphrase_generation` | `title`, `text`, `claims`, `paraphrase` | train 67,419 · validation 13,848 |
| `LLM-Oasis_unfactual_text_generation` | `title`, `text`, `unfactual_claims`, `paraphrase`, `unfactual_text` | train 67,385 · validation 13,838 |
| `LLM-Oasis_claim_verification` (gold, Task 2) | `id`, `claim`, `evidence` | gold 2,656 |

Train plus validation adds up to about 81K rows per step, in line with the 81,275 pages in the paper. The falsification release is smaller (52,390 rows) than the 81,275 falsified claims reported in Table 2.

The unfactual text dataset already holds both sides of each pair: `paraphrase` is the factual text and `unfactual_text` is the version with the falsified claim. That is enough to build a binary training set for an end-to-end factuality classifier:

```python
from datasets import load_dataset

pairs = load_dataset("Babelscape/LLM-Oasis_unfactual_text_generation", split="train")

def to_examples(batch):
    texts = batch["paraphrase"] + batch["unfactual_text"]
    labels = [True] * len(batch["paraphrase"]) + [False] * len(batch["unfactual_text"])
    return {"text": texts, "factual": labels}

train = pairs.map(to_examples, batched=True, remove_columns=pairs.column_names)

# Task 2 gold set: one claim and one evidence passage per row, labels withheld
gold = load_dataset("Babelscape/LLM-Oasis_claim_verification", split="gold")
```

The gold data for both tasks is released without labels for blind evaluation. For Task 1 the README links a submission form: you upload a `.jsonl` file with one `{"id": ..., "factual": true/false}` entry per text, where `id` matches `Babelscape/LLM-Oasis_e2e_factuality_evaluation`. At the time of writing, the Hub API reports that dataset as not accessible without authentication.

## How it was built

The source is English Wikipedia, restricted to the most visited pages. Each page is split into passages of K = 5 sentences with a sliding window of stride 1, and one passage per page is sampled. GPT-4 then runs four steps on each passage in a single unified prompt (Table 1 of the paper):

<figure class="flow" aria-label="How LLM-Oasis turns a Wikipedia passage into a factual and an unfactual text, in four steps">
<ol>
<li><b>Claim extraction</b><span>List every atomic, self-contained claim in the passage, at most 15 words each, no pronouns as subjects</span></li>
<li><b>Claim falsification</b><span>Subtly alter the most relevant claim; the prompt forbids changing dates, numbers or names and naive negations</span></li>
<li><b>Factual text</b><span>Paraphrase the passage from the original claims, with as little wording overlap as possible</span></li>
<li><b>Unfactual text</b><span>Rewrite the paraphrase from the claim set that includes the falsified claim, changing only that part</span></li>
</ol>
<figcaption>Paraphrasing is deliberate: an LLM may have memorised the original Wikipedia text, and a retriever would find it verbatim. Only one claim is falsified per passage, because a single hidden error is harder to catch than several.</figcaption>
</figure>

The paper's running example shows the style of error. From a passage on the Amazon rainforest, the claim "Brazil contains 60% of the rainforest" becomes "The majority of the forest is contained within Peru": another country the rainforest covers, so the error is plausible in context.

The result (Table 2): **81,275 pages, 681,201 claims** (8.4 per passage on average), 81,275 falsified claims, and 81,275 factual plus 81,275 unfactual texts of about 83 and 87 tokens.

**Human validation.** Five expert linguists checked 1,750 instances per step, with 100 shared by all annotators to measure agreement (Table 3):

| Step | Accuracy | Fleiss' κ |
|---|---|---|
| Claim extraction | 96.78% | 0.81 |
| Claim falsification | 98.55% | 0.84 |
| Factual text generation | 90.36% | 0.73 |
| Unfactual text generation | 89.20% | 0.72 |

**Gold benchmark.** Only instances that no annotator flagged as an error at any stage are kept; texts flagged for omitting a detail are discarded too. From these the paper defines two tasks:

- **Task 1, end-to-end factuality evaluation:** given a text, output True if it is factual and False if it contains an inaccuracy. Inputs are only the generated factual and unfactual texts, never the original Wikipedia passage. About 2k instances.
- **Task 2, evidence-based claim verification:** given one claim and one evidence passage (the factual text), output whether the evidence supports the claim. Original claims are labelled True, their falsified versions False.

**A baseline built from the training data.** The paper also trains a small modular system on the silver data: a T5-base claim extractor, an E5-base dense retriever trained on about 3.2M ⟨claim, evidence⟩ pairs, and a DeBERTa-v3-large NLI claim verifier trained on 3.2M triplets. A text counts as factual only if every extracted claim is verified against the retrieved passages. Fine-tuning lifts the retriever's Recall@30 from 0.52 to 0.95.

## Results

The metric is **balanced accuracy** (%) on the gold benchmark, so a random guess scores 50. Open-weight models are averaged over five seeds. "E2E" is Task 1, "claim verif." is Task 2.

| Model | Size | E2E zero-shot | E2E with retrieval | Claim verif. zero-shot | Claim verif. best prompt |
|---|---|---|---|---|---|
| Fine-tuned pipeline (ours) | 1B / 0.4B | n/a | **69.24** | n/a | 93.30 |
| GPT-4o | n/a | 60.8 | 68.0 | 89.49 | 93.93 |
| Llama-3.3-70B-Instruct | 70B | 59.2 | 58.8 | 91.79 | **94.08** |
| Phi-4 | 14B | 57.2 | 57.6 | 84.14 | 92.69 |
| Qwen2.5-7B-Instruct | 7B | 55.8 | 54.7 | 84.85 | 87.11 |
| Falcon3-Mamba-7B-Instruct | 7B | 55.3 | 51.0 | 63.45 | 74.98 |
| Phi-4-mini-instruct | 4B | 54.4 | 56.3 | 70.50 | 84.06 |
| Llama-3.1-8B-Instruct | 8B | 53.6 | 54.1 | 78.56 | 86.55 |
| Mistral-7B-Instruct-v0.3 | 7B | 51.2 | 50.5 | 72.87 | 80.67 |

Sources: Tables 5, 6 and 7. The fine-tuned row is the full 1B pipeline on Task 1 and the 0.4B claim verifier alone on Task 2. "Best prompt" is the highest of zero-shot, few-shot and their explain-then-answer variants.

<figure class="chart" role="img" aria-label="Balanced accuracy on LLM-Oasis end-to-end factuality evaluation. Fine-tuned pipeline 69.24. GPT-4o 60.8 zero-shot, 68.0 with retrieval. Llama-3.3-70B 59.2 and 58.8. Phi-4 57.2 and 57.6. Qwen2.5-7B 55.8 and 54.7. Falcon3-Mamba-7B 55.3 and 51.0. Phi-4-mini 54.4 and 56.3. Llama-3.1-8B 53.6 and 54.1. Mistral-7B 51.2 and 50.5.">
<svg viewBox="0 0 680 436" width="100%" preserveAspectRatio="xMidYMid meet">
<g font-size="12"><rect x="190" y="10" width="12" height="12" rx="3" class="ch-a"/><text x="208" y="20">Zero-shot, no evidence</text><rect x="370" y="10" width="12" height="12" rx="3" class="ch-b"/><text x="388" y="20">With top-30 retrieved Wikipedia passages</text></g>
<g>
<line x1="190" x2="190" y1="50" y2="410" class="ch-grid"/>
<line x1="306.5" x2="306.5" y1="50" y2="410" class="ch-grid"/>
<line x1="423" x2="423" y1="50" y2="410" class="ch-grid"/>
<line x1="539.5" x2="539.5" y1="50" y2="410" class="ch-grid"/>
<line x1="656" x2="656" y1="50" y2="410" class="ch-grid"/>
<text x="190" y="428" text-anchor="middle" class="ch-tick">0</text>
<text x="306.5" y="428" text-anchor="middle" class="ch-tick">25</text>
<text x="423" y="428" text-anchor="middle" class="ch-tick">50</text>
<text x="539.5" y="428" text-anchor="middle" class="ch-tick">75</text>
<text x="656" y="428" text-anchor="middle" class="ch-tick">100%</text>
</g>
<g class="ch-row"><title>Fine-tuned pipeline (1B): 69.24 (pipeline uses retrieval)</title><text x="176" y="75" text-anchor="end" class="ch-label">Fine-tuned pipeline (1B)</text><rect x="190" y="71" width="322.7" height="15" rx="4" class="ch-b"/><text x="518.7" y="83" class="ch-val">69.24</text></g>
<g class="ch-row"><title>GPT-4o: zero-shot 60.8, with retrieval 68.0</title><text x="176" y="115" text-anchor="end" class="ch-label">GPT-4o</text><rect x="190" y="94" width="283.3" height="15" rx="4" class="ch-a"/><text x="479.3" y="106" class="ch-val">60.8</text><rect x="190" y="111" width="316.9" height="15" rx="4" class="ch-b"/><text x="512.9" y="123" class="ch-val">68.0</text></g>
<g class="ch-row"><title>Llama-3.3-70B-Instruct: zero-shot 59.2, with retrieval 58.8</title><text x="176" y="155" text-anchor="end" class="ch-label">Llama-3.3-70B-Instruct</text><rect x="190" y="134" width="275.9" height="15" rx="4" class="ch-a"/><text x="471.9" y="146" class="ch-val">59.2</text><rect x="190" y="151" width="274.0" height="15" rx="4" class="ch-b"/><text x="470.0" y="163" class="ch-val">58.8</text></g>
<g class="ch-row"><title>Phi-4 (14B): zero-shot 57.2, with retrieval 57.6</title><text x="176" y="195" text-anchor="end" class="ch-label">Phi-4 (14B)</text><rect x="190" y="174" width="266.6" height="15" rx="4" class="ch-a"/><text x="462.6" y="186" class="ch-val">57.2</text><rect x="190" y="191" width="268.4" height="15" rx="4" class="ch-b"/><text x="464.4" y="203" class="ch-val">57.6</text></g>
<g class="ch-row"><title>Qwen2.5-7B-Instruct: zero-shot 55.8, with retrieval 54.7</title><text x="176" y="235" text-anchor="end" class="ch-label">Qwen2.5-7B-Instruct</text><rect x="190" y="214" width="260.0" height="15" rx="4" class="ch-a"/><text x="456.0" y="226" class="ch-val">55.8</text><rect x="190" y="231" width="254.9" height="15" rx="4" class="ch-b"/><text x="450.9" y="243" class="ch-val">54.7</text></g>
<g class="ch-row"><title>Falcon3-Mamba-7B: zero-shot 55.3, with retrieval 51.0</title><text x="176" y="275" text-anchor="end" class="ch-label">Falcon3-Mamba-7B</text><rect x="190" y="254" width="257.7" height="15" rx="4" class="ch-a"/><text x="453.7" y="266" class="ch-val">55.3</text><rect x="190" y="271" width="237.7" height="15" rx="4" class="ch-b"/><text x="433.7" y="283" class="ch-val">51.0</text></g>
<g class="ch-row"><title>Phi-4-mini (4B): zero-shot 54.4, with retrieval 56.3</title><text x="176" y="315" text-anchor="end" class="ch-label">Phi-4-mini (4B)</text><rect x="190" y="294" width="253.5" height="15" rx="4" class="ch-a"/><text x="449.5" y="306" class="ch-val">54.4</text><rect x="190" y="311" width="262.4" height="15" rx="4" class="ch-b"/><text x="458.4" y="323" class="ch-val">56.3</text></g>
<g class="ch-row"><title>Llama-3.1-8B-Instruct: zero-shot 53.6, with retrieval 54.1</title><text x="176" y="355" text-anchor="end" class="ch-label">Llama-3.1-8B-Instruct</text><rect x="190" y="334" width="249.8" height="15" rx="4" class="ch-a"/><text x="445.8" y="346" class="ch-val">53.6</text><rect x="190" y="351" width="252.1" height="15" rx="4" class="ch-b"/><text x="448.1" y="363" class="ch-val">54.1</text></g>
<g class="ch-row"><title>Mistral-7B-v0.3: zero-shot 51.2, with retrieval 50.5</title><text x="176" y="395" text-anchor="end" class="ch-label">Mistral-7B-v0.3</text><rect x="190" y="374" width="238.6" height="15" rx="4" class="ch-a"/><text x="434.6" y="386" class="ch-val">51.2</text><rect x="190" y="391" width="235.3" height="15" rx="4" class="ch-b"/><text x="431.3" y="403" class="ch-val">50.5</text></g>
</svg>
<figcaption>Balanced accuracy (%) on Task 1, Table 5 of the paper; 50 is chance. Only GPT-4o gains much from retrieved evidence, and the small fine-tuned pipeline (which also uses retrieval) is the best system.</figcaption>
</figure>

What the numbers say:

- **End-to-end factuality evaluation is hard.** Open-weight LLMs score between 51.2 and 59.2 zero-shot. The best open-weight score in any prompt setting is 61.7 (Llama-3.3-70B-Instruct, few-shot, Table 4).
- **Retrieval mostly does not help LLMs.** With the top 30 retrieved passages, most models stay flat or drop. GPT-4o is the exception, going from 60.8 to 68.0. Truncating the RAG prompt from 18k down to 2k tokens leaves performance roughly stable (Figure 3), so long context alone is not the cause.
- **A small specialised pipeline wins.** The 1B pipeline trained on LLM-Oasis reaches 69.24, above every LLM tested, including GPT-4o with retrieval.
- **Claim verification is much easier than end-to-end evaluation.** With the right evidence given and a single claim of about 100 tokens of context (against about 4k in the end-to-end task), best-prompt scores rise to between 74.98 and 94.08. The 0.4B verifier reaches 93.30, close to Llama-3.3-70B (94.08) and GPT-4o (93.93) in their best settings.

## Limitations

- **The training data is LLM-generated.** Human checks show 89 to 99% accuracy per step, but errors remain. The authors recommend the silver data for building systems and the gold benchmark for evaluation.
- **One prompt for all four steps.** Generation used a single GPT-4 call per passage instead of multi-step prompting, mainly to save cost (multi-step would have cost about four times as much). A qualitative comparison showed no clear quality gain from multi-step.
- **Wikipedia changes.** Unfactual texts stay unfactual, but factual texts can become outdated as pages are revised.
- **Popular pages only.** Long-tail facts are not targeted, though popular pages still contain lesser-known details.
- **English only.** Other languages and domains are left to future work.
- **Non-commercial license.** CC BY-NC-SA 4.0.

## Questions people ask

**How is LLM-Oasis different from FEVER?** FEVER has 185,445 human-written claims built from about 10k Wikipedia pages and asks you to verify one claim at a time. LLM-Oasis asks whether a multi-sentence text is factual, with the error hidden in one of several claims, and covers 81,275 pages. The falsification prompt rules out simple negations and changes to dates, numbers or names, aiming for plausible substitutions rather than flipped verbs.

**How is it different from FACTOR or FELM?** Both are benchmarks: FACTOR has 4,266 instances and FELM 847 LLM outputs. LLM-Oasis is large enough to train factuality evaluators, with 81k text pairs and 681,201 claims, and it is not tied to one task such as summarisation.

**What tasks does it support?** Two benchmark tasks: end-to-end factuality evaluation of raw text (Task 1) and evidence-based claim verification (Task 2). The four training datasets also cover claim extraction, claim falsification and factual or unfactual text generation as separate supervised tasks.

**How do I evaluate my LLM on it?** For Task 1, predict True or False for each text in `Babelscape/LLM-Oasis_e2e_factuality_evaluation` (not publicly accessible on the Hub at the time of writing) and submit the `.jsonl` through the form in the README; results are reported as balanced accuracy. For Task 2, the gold claim-evidence pairs are public in `Babelscape/LLM-Oasis_claim_verification`, also without labels; the README does not describe a separate submission route.

**Can I train on it?** Yes. The four silver datasets have train and validation splits, and the paper's baseline fine-tunes T5, E5 and DeBERTa models on them. Use is limited to non-commercial purposes under CC BY-NC-SA 4.0.

**Does giving the model Wikipedia evidence solve the task?** Not for most LLMs. At 18k tokens the passage needed to verify a text is in the retrieved evidence 95% of the time, yet most open-weight models score about the same as without it. The difficulty is using the evidence, not finding it.

## Cite

```bibtex
@article{10.1162/COLI.a.575,
    author = {Scirè, Alessandro and Bejgu, Andrei Stefan and Tedeschi, Simone and Ghonim, Karim and Martelli, Federico and Navigli, Roberto},
    title = {Truth or Mirage? Towards End-To-End Factuality Evaluation with LLM-Oasis},
    journal = {Computational Linguistics},
    volume = {52},
    number = {1},
    pages = {1-41},
    year = {2026},
    issn = {0891-2017},
    doi = {10.1162/COLI.a.575},
    url = {https://doi.org/10.1162/COLI.a.575}
}
```

Paper: [MIT Press](https://direct.mit.edu/coli/article/52/1/1/133509/Truth-or-Mirage-Towards-End-To-End-Factuality) · [arXiv](https://arxiv.org/abs/2411.19655) · Code: [GitHub](https://github.com/Babelscape/LLM-Oasis) · Data: [Hugging Face collection](https://huggingface.co/collections/Babelscape/llm-oasis-674db6e4ff329619b8ed6b82)
