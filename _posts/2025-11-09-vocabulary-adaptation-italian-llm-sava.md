---
layout: post
title: "Vocabulary adaptation for an Italian LLM: cutting token fertility with SAVA (NAACL 2025 Findings)"
date: 2025-11-09 09:00:00
last_modified_at: 2026-11-11 12:00:00
description: "Swapping the tokenizer of Mistral-7B-v0.1 and Llama-3.1-8B for an Italian one cuts Italian token fertility by 25% (Mistral) and 16% (Llama) and shrinks Llama-3.1-8B from 8.03B to 7.25B parameters. With SAVA initialisation and 12B tokens of continual training, the adapted Mistral matches or beats the original on Italian benchmarks."
tags: llm tokenizer vocabulary-adaptation italian naacl2025 research fine-tuning
categories: research
keywords: vocabulary adaptation, token fertility, Italian LLM, SAVA, Semantic Alignment Vocabulary Adaptation, FVT, Fast Vocabulary Transfer, CLP, tokenizer replacement, embedding initialization, continual pretraining, language adaptation, Mistral-7B, Llama-3.1-8B, Minerva, CulturaX, NAACL 2025, Sapienza NLP
author: Andrei Stefan Bejgu
---

English-first LLMs split Italian words into more pieces than English words, so every Italian prompt costs more tokens, more memory and more latency. In this paper we replace the tokenizer of **Mistral-7B-v0.1** and **Llama-3.1-8B** with the Italian-English tokenizer of the Minerva models, initialise the new embeddings with a method we call **SAVA** (Semantic Alignment Vocabulary Adaptation), and continue training on 12B tokens. Italian token fertility drops by **25%** for Mistral and **16%** for Llama, Llama-3.1-8B shrinks from **8.03B to 7.25B parameters**, and the adapted models recover base-model quality on Italian tasks.

| | |
|---|---|
| Paper | [Optimizing LLMs for Italian: Reducing Token Fertility and Enhancing Efficiency Through Vocabulary Adaptation](https://aclanthology.org/2025.findings-naacl.371/), Findings of NAACL 2025, pages 6661–6675 ([arXiv 2504.17025](https://arxiv.org/abs/2504.17025)) |
| Authors | Luca Moroni, Giovanni Puccetti, Pere-Lluís Huguet Cabot, Andrei Stefan Bejgu, Alessio Miaschi, Edoardo Barba, Felice Dell'Orletta, Andrea Esuli, Roberto Navigli (Sapienza NLP, ISTI-CNR, ILC-CNR, Babelscape) |
| Code | [SapienzaNLP/sava](https://github.com/SapienzaNLP/sava) (CC BY-NC-SA 4.0) |
| Models | [Mistral-7B-v0.1 adapted](https://huggingface.co/collections/SemanticAlignment/mistral-7b-v01-adapted-679243206cec8a21f75435dd) (Random, FVT, CLP, SAVA, LAPT) and [Llama-3.1-8B adapted](https://huggingface.co/collections/SemanticAlignment/llama-31-adapted-67924314d8957c78a3e7bcaf) (FVT, SAVA, LAPT), under the `SemanticAlignment` org |
| Use it for | Moving an English LLM to another language with a cheaper tokenizer, choosing how to initialise new embeddings, budgeting the continual training that follows |

## What is token fertility and why it costs you

**Token fertility** is the average number of tokens a tokenizer produces per word. A tokenizer trained mostly on English learns long English merges and few Italian ones, so "aggiornamento" ends up in several pieces. Higher fertility means longer sequences for the same text: more compute per sentence, less text in the context window, slower generation.

Table 2 of the paper measures it on Italian and English text from CulturaX and Wikipedia:

| Tokenizer | CulturaX IT | CulturaX EN | Wikipedia IT | Wikipedia EN |
|---|---|---|---|---|
| Mistral-7B-v0.1 | 1.88 | 1.32 | 2.05 | 1.57 |
| Llama-3 (8B) | 1.67 | 1.15 | 1.80 | 1.31 |
| Minerva | **1.39** | 1.32 | **1.66** | 1.59 |

<figure class="chart" role="img" aria-label="Token fertility on Italian text. Mistral-7B-v0.1: 1.88 on CulturaX, 2.05 on Wikipedia. Llama-3: 1.67 and 1.80. Minerva: 1.39 and 1.66. Lower is better.">
<svg viewBox="0 0 680 200" width="100%" preserveAspectRatio="xMidYMid meet">
<g font-size="12"><rect x="190" y="10" width="12" height="12" rx="3" class="ch-a"/><text x="208" y="20">CulturaX (Italian)</text><rect x="370" y="10" width="12" height="12" rx="3" class="ch-b"/><text x="388" y="20">Wikipedia (Italian)</text></g>
<g>
<line x1="190" x2="190" y1="46" y2="172" class="ch-grid"/>
<line x1="283.2" x2="283.2" y1="46" y2="172" class="ch-grid"/>
<line x1="376.4" x2="376.4" y1="46" y2="172" class="ch-grid"/>
<line x1="469.6" x2="469.6" y1="46" y2="172" class="ch-grid"/>
<line x1="562.8" x2="562.8" y1="46" y2="172" class="ch-grid"/>
<line x1="656" x2="656" y1="46" y2="172" class="ch-grid"/>
<text x="190" y="190" text-anchor="middle" class="ch-tick">0</text>
<text x="283.2" y="190" text-anchor="middle" class="ch-tick">0.5</text>
<text x="376.4" y="190" text-anchor="middle" class="ch-tick">1.0</text>
<text x="469.6" y="190" text-anchor="middle" class="ch-tick">1.5</text>
<text x="562.8" y="190" text-anchor="middle" class="ch-tick">2.0</text>
<text x="656" y="190" text-anchor="middle" class="ch-tick">2.5</text>
</g>
<g class="ch-row"><title>Mistral-7B-v0.1 tokenizer: CulturaX 1.88, Wikipedia 2.05</title><text x="176" y="75" text-anchor="end" class="ch-label">Mistral-7B-v0.1</text><rect x="190" y="54" width="350.4" height="15" rx="4" class="ch-a"/><text x="546.4" y="66" class="ch-val">1.88</text><rect x="190" y="71" width="382.1" height="15" rx="4" class="ch-b"/><text x="578.1" y="83" class="ch-val">2.05</text></g>
<g class="ch-row"><title>Llama-3 tokenizer: CulturaX 1.67, Wikipedia 1.80</title><text x="176" y="115" text-anchor="end" class="ch-label">Llama-3</text><rect x="190" y="94" width="311.3" height="15" rx="4" class="ch-a"/><text x="507.3" y="106" class="ch-val">1.67</text><rect x="190" y="111" width="335.5" height="15" rx="4" class="ch-b"/><text x="531.5" y="123" class="ch-val">1.80</text></g>
<g class="ch-row"><title>Minerva tokenizer: CulturaX 1.39, Wikipedia 1.66</title><text x="176" y="155" text-anchor="end" class="ch-label">Minerva</text><rect x="190" y="134" width="259.1" height="15" rx="4" class="ch-a"/><text x="455.1" y="146" class="ch-val">1.39</text><rect x="190" y="151" width="309.4" height="15" rx="4" class="ch-b"/><text x="505.4" y="163" class="ch-val">1.66</text></g>
</svg>
<figcaption>Tokens per word on Italian text, Table 2 of the paper (lower is better). The Minerva tokenizer has 32,768 entries, a quarter of Llama-3's 128,256, yet produces the fewest tokens per Italian word.</figcaption>
</figure>

The Minerva tokenizer also costs nothing in model size for Mistral (32,000 to 32,768 entries, 7.24B to 7.25B parameters) and saves a lot for Llama-3.1-8B (128,256 to 32,768 entries, a 75% smaller vocabulary, 8.03B to 7.25B parameters, Table 1). That is the efficiency gain. The open question is how to give the model useful embeddings for tokens it has never seen.

## How to adapt an LLM's vocabulary to a new language

<figure class="flow" aria-label="Vocabulary adaptation pipeline in four steps">
<ol>
<li><b>Pick a target tokenizer</b><span>A tokenizer trained on the target language; the paper reuses Minerva's 32,768-token Italian-English vocabulary</span></li>
<li><b>Copy shared tokens</b><span>Tokens present in both vocabularies keep their original embedding: 16,438 shared with Mistral, 20,358 with Llama-3.1-8B</span></li>
<li><b>Initialise the new tokens</b><span>Random, FVT, CLP or SAVA decide the vectors for every token the source model did not have</span></li>
<li><b>Continual training</b><span>About 12B tokens, 75% Italian and 25% English, all parameters trainable</span></li>
</ol>
<figcaption>The four methods differ only in step 3. When the input embeddings and the LM head are not tied, steps 2 and 3 are applied to each of them.</figcaption>
</figure>

### 1. Measure token fertility

The repo's `embedding_analysis/compute_fertility.py` averages `len(tokens) / len(words)` per document over 50,000 documents, splitting words with NLTK `word_tokenize`. This shorter version uses whitespace words, so its numbers will not match Table 2 exactly. Both tokenizers below are public: the SAVA-adapted Mistral ships the Minerva tokenizer.

```python
from itertools import islice
from datasets import load_dataset
from transformers import AutoTokenizer

docs = [d["text"] for d in islice(
    load_dataset("wikimedia/wikipedia", "20231101.it", split="train", streaming=True), 2000)]

def fertility(tok_id: str) -> float:
    tok = AutoTokenizer.from_pretrained(tok_id)
    per_doc = [len(tok(t, add_special_tokens=False).input_ids) / max(len(t.split()), 1) for t in docs]
    return sum(per_doc) / len(per_doc)

for tok_id in ["mistralai/Mistral-7B-v0.1", "SemanticAlignment/Mistral-v0.1-Italian-SAVA"]:
    print(f"{tok_id}: {fertility(tok_id):.2f} tokens per word")
```

### 2. Train a target-language tokenizer

The paper did not train a tokenizer: it reused Minerva's, which was trained on Italian and English CulturaX. If no good tokenizer exists for your language, `train_new_from_iterator` keeps the algorithm and special tokens of an existing fast tokenizer and learns a new vocabulary. A mix of target and source language text keeps English usable.

```python
from itertools import islice
from datasets import load_dataset
from transformers import AutoTokenizer

stream = load_dataset("uonlp/CulturaX", "it", split="train", streaming=True)  # gated: accept terms on the Hub

def batches(n_docs=1_000_000, size=1000):
    it = (d["text"] for d in islice(stream, n_docs))
    while batch := list(islice(it, size)):
        yield batch

base = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-v0.1")
it_tok = base.train_new_from_iterator(batches(), vocab_size=32_768)
it_tok.save_pretrained("tokenizer-it")
```

### 3. Initialise the new embeddings

Every method fills the new embedding matrix the same way for shared tokens (copy the source vector) and differs for the rest. **FVT** (Fast Vocabulary Transfer, Gee et al. 2022) re-tokenises each new token with the old tokenizer and averages the old embeddings of the pieces:

```python
import torch

@torch.no_grad()
def fvt_init(src_emb: torch.Tensor, src_tok, tgt_tok) -> torch.Tensor:
    """src_emb: [V_src, d] (input embeddings or LM head). Returns [V_tgt, d]."""
    src_vocab = src_tok.get_vocab()
    out = torch.empty(len(tgt_tok), src_emb.shape[1], dtype=src_emb.dtype)
    for token, idx in tgt_tok.get_vocab().items():
        if token in src_vocab:                       # shared token: copy
            out[idx] = src_emb[src_vocab[token]]
            continue
        text = tgt_tok.convert_tokens_to_string([token])
        pieces = src_tok(text, add_special_tokens=False).input_ids
        out[idx] = src_emb[pieces].mean(0) if pieces else src_emb.mean(0)
    return out
```

Matching shared tokens needs care when the two tokenizers mark spaces differently. The repo maps Llama's byte-level `Ġ` to the SentencePiece `▁` before comparing vocabularies (`_map_llama_to_minerva` in `adaptation/core/average_naive.py` and `semantic_alignment.py`).

**SAVA** uses a helper model that already speaks the target tokenizer: Minerva-3B, whose embeddings cover every token in the new vocabulary. It learns an affine map ϕ(x) = Wx + b from Minerva-3B's embedding space to the source model's, fitted to minimise the squared error on tokens the two vocabularies share, then maps each new token's Minerva-3B embedding into the source space (Section 3.1, Equation 1). In the code (`adaptation/core/semantic_alignment.py`) the map is a latentis `Translator`: both spaces are standardised and L2-normalised, dimensions are matched by zero padding, and the `sgd` aligner is `SGDAffineAligner(num_steps=1000, lr=1e-3)`. When the LM head is not tied, a second translator is fitted on the LM head weights.

The README's documented entry point, for Llama-3.1-8B:

```bash
cd sava/adaptation
python main.py \
  --source_model_name_or_path meta-llama/Llama-3.1-8B \
  --source_tokenizer_name_or_path meta-llama/Llama-3.1-8B \
  --helper_model_name_or_path sapienzanlp/Minerva-3B-base-v1.0 \
  --target_tokenizer_name_or_path sapienzanlp/Minerva-3B-base-v1.0 \
  --seed 42 \
  --initialization_method semantic_alignment \
  --aligner sgd \
  --output_dir /path/to/output/model/dir/llama-3.1-italian-sava
```

Other values of `--initialization_method` are `average_naive` (FVT), `clp` and `clp_random`. Tip: also pass `--anchor_selection full` (use the whole shared vocabulary as anchors) or `--num_anchors N`, since the default anchor selection expects a count. If you would rather skip the CLI, you can call the initializer from Python:

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from core import SemanticAlignmentEmbeddingInitializer  # run from sava/adaptation/

src = "mistralai/Mistral-7B-v0.1"
helper = "sapienzanlp/Minerva-3B-base-v1.0"  # gated: accept terms on the Hub
target_tok = AutoTokenizer.from_pretrained(helper)

model = SemanticAlignmentEmbeddingInitializer(
    source_model=AutoModelForCausalLM.from_pretrained(src, torch_dtype=torch.float16),
    source_tokenizer=AutoTokenizer.from_pretrained(src),
    helper_model=AutoModelForCausalLM.from_pretrained(helper, torch_dtype=torch.float16),
    target_tokenizer=target_tok,
    seed=42,
    tie_weights=False,        # Mistral and Llama-3.1 have an untied LM head
    aligner="sgd",            # also "matrix" (least squares) or "ortho" (Procrustes)
    anchor_selection="full",  # fit on every shared token; "random" samples num_anchors of them
)()
model.save_pretrained("mistral-it-sava")
target_tok.save_pretrained("mistral-it-sava")
```

### 4. Continual training after adaptation

The paper trained with llm-foundry v0.8.0 (configs in `training/yamls/pretrain/`). The snippet below is a **minimal recipe, not the paper's exact setup**: same data mix and learning rate, Hugging Face `Trainer` instead of llm-foundry, and a batch size you would scale to your hardware.

```python
import torch
from itertools import chain
from datasets import load_dataset, interleave_datasets
from transformers import (AutoModelForCausalLM, AutoTokenizer, DataCollatorForLanguageModeling,
                          Trainer, TrainingArguments)

path, seq_len = "mistral-it-sava", 2048
tok = AutoTokenizer.from_pretrained(path)
tok.pad_token = tok.pad_token or tok.eos_token
model = AutoModelForCausalLM.from_pretrained(path, torch_dtype=torch.bfloat16)

cx = lambda lang: load_dataset("uonlp/CulturaX", lang, split="train", streaming=True).select_columns(["text"])
mix = interleave_datasets([cx("it"), cx("en")], probabilities=[0.75, 0.25], seed=17)

def tokenize_and_pack(batch):
    ids = list(chain.from_iterable(tok(batch["text"]).input_ids))
    n = len(ids) // seq_len * seq_len
    return {"input_ids": [ids[i:i + seq_len] for i in range(0, n, seq_len)]}

train = mix.map(tokenize_and_pack, batched=True, remove_columns=["text"])

args = TrainingArguments(
    output_dir="ckpt-mistral-it-sava",
    max_steps=2000,                  # streaming datasets need max_steps
    per_device_train_batch_size=4,
    gradient_accumulation_steps=32,  # tokens per step = devices x 4 x 32 x 2048
    learning_rate=1e-5,
    lr_scheduler_type="cosine",
    warmup_steps=20,
    bf16=True,
    gradient_checkpointing=True,
    logging_steps=10,
    save_steps=200,
)
Trainer(model=model, args=args, train_dataset=train,
        data_collator=DataCollatorForLanguageModeling(tok, mlm=False)).train()
```

What the paper actually ran (Section 4.2, `training/README.md`, the two YAML files):

| | Mistral-7B-v0.1 | Llama-3.1-8B |
|---|---|---|
| Data | CulturaX, first 9B Italian + first 3B English tokens | same |
| Sequence length | 2048 | 8192 |
| Global batch (sequences) | 3072 | 512 |
| Steps | 2000 | 3000 |
| Tokens | ≈12B | ≈12B |
| Learning rate | 1e-5, cosine with 20-batch warmup | 1e-5, cosine with 30-batch warmup |
| Hardware | 16 nodes × 4 A100 64 GB (Leonardo) | Leonardo |
| Frozen parameters | none | none |

Neither the paper nor the repo covers instruction tuning of the adapted models; they are base models.

## SAVA vs FVT and the other methods

- **Random**: new tokens drawn from a normal distribution with the mean and variance of the source embeddings. The floor.
- **FVT** (Gee et al., 2022): mean of the source embeddings of the old-tokenizer pieces. No helper model, no training.
- **CLP** (Ostendorff and Rehm, 2023): each new token is a weighted sum of shared-token source embeddings, weighted by cosine similarity measured in the helper model's space.
- **SAVA** (this paper): an affine map from the helper's embedding space to the source's, learned on shared tokens and applied to new ones.
- **LAPT**: continual training of the base model with its original tokenizer. No fertility gain; the reference for how much quality vocabulary adaptation should recover.

FVT and SAVA both start much closer to useful than Random and CLP. SAVA's advantage is that it uses a model that has actually learned the target-language tokens in context, instead of guessing from how the old tokenizer splits them.

## Results

**Italian multiple choice** (0-shot, six benchmarks from the translated part of ITA-Bench, average accuracy):

| Model | Early | End | Base model |
|---|---|---|---|
| Mistral Random | 61.96 | 65.62 | 65.43 |
| Mistral FVT | 64.32 | 66.94 | |
| Mistral CLP | 61.24 | 66.95 | |
| Mistral SAVA | 64.01 | **66.99** | |
| Mistral LAPT | 66.60 | 67.56 | |
| Llama FVT | 63.81 | 65.79 | 66.42 |
| Llama SAVA | 64.48 | 66.29 | |
| Llama LAPT | 66.01 | 66.62 | |

Early is 200 steps for Mistral and 300 for Llama; end is 2000 and 3000 (Tables 3 and 4). Every adapted Mistral beats the original Mistral by the end. SAVA and FVT reach at 400 batches what Random reaches at the end, about **80% less training**, and Mistral recovers base-model performance after about 2B tokens. For Llama, SAVA scores 74.15 on BoolQ against 69.35 for FVT and 71.77 for LAPT.

**Generation** (Tables 5 and 6: FLoRes 5-shot, COMET-22; SQuAD-it 2-shot, ROUGE-L):

| Model | EN→IT | IT→EN | SQuAD-it |
|---|---|---|---|
| Mistral base | 86.57 | 87.75 | 68.92 |
| Mistral SAVA (2000) | **88.31** | 87.87 | 67.20 |
| Mistral FVT (2000) | 88.29 | 87.90 | 66.18 |
| Mistral LAPT (2000) | 88.13 | 88.02 | 66.92 |
| Llama base | 87.59 | 88.08 | 69.21 |
| Llama SAVA (3000) | **88.12** | 88.04 | 69.05 |
| Llama FVT (3000) | 88.05 | 88.02 | 68.84 |
| Llama LAPT (3000) | 88.11 | 88.05 | 66.69 |

SAVA has the best SQuAD-it score among the trained variants for both models and the best EN→IT translation, the direction that generates Italian.

**Embedding structure.** Using relative representations over 256 anchor tokens, SAVA's embeddings are the closest to Minerva-3B's (Table 7): 44.81 at step 0 and 45.33 after training for Mistral, against 41.10 and 42.84 for CLP, 33.65 and 35.30 for FVT, 29.68 and 31.67 for Random.

## Limitations

- **English drops.** All adapted Mistral models score below the original on English benchmarks; for Llama, LAPT keeps English better, likely thanks to its larger vocabulary.
- **Translated benchmarks.** The multiple-choice sets were machine-translated with Tower-Instruct-v0.2, which can add noise.
- **Web data only.** Continual training used CulturaX alone.
- **Two models, one language.** Mistral-7B-v0.1 and Llama-3.1-8B, Italian only; Random and CLP were not run on Llama.
- **Compute.** About 50,000 A100 GPU hours in total, estimated at 8,640 kgCO2eq (Appendix C).

## Questions people ask

**What is SAVA?** Semantic Alignment Vocabulary Adaptation: initialise the embeddings of new tokens by mapping a helper model's embeddings (Minerva-3B) into the source model's space with an affine map learned on the shared vocabulary.

**How much does vocabulary adaptation reduce token fertility for Italian?** With the Minerva tokenizer, by 25% for Mistral-7B-v0.1 and up to 16% for Llama-3.1-8B, on CulturaX and Wikipedia text.

**Is SAVA better than FVT?** They are close. SAVA has a lower training loss from the start, the best end-of-training Italian average for Mistral (66.99 vs 66.94), better BoolQ and SQuAD-it scores, and better English for both models. FVT needs no helper model.

**Can I skip continual training?** No. Initialisation makes the model usable at step 0, but every method needs continual training to recover; the paper used about 12B tokens and the gap to the base model closed after about 2B for Mistral.

**Does it need a helper model?** SAVA and CLP do: a model already trained with the target tokenizer. The paper also tested Minerva-350M and Minerva-1B as helpers and found helper size had little effect on the loss, while fitting the map on fewer shared tokens slowed convergence (Appendix B).

**Where are the adapted models?** On Hugging Face under `SemanticAlignment`, e.g. `SemanticAlignment/Mistral-v0.1-Italian-SAVA` and `SemanticAlignment/Llama-3.1-8B-Italian-SAVA`.

## Cite

```bibtex
@inproceedings{moroni-etal-2025-optimizing,
    title = "Optimizing {LLM}s for {I}talian: Reducing Token Fertility and Enhancing Efficiency Through Vocabulary Adaptation",
    author = "Moroni, Luca  and
      Puccetti, Giovanni  and
      Huguet Cabot, Pere-Llu{\'i}s  and
      Bejgu, Andrei Stefan  and
      Miaschi, Alessio  and
      Barba, Edoardo  and
      Dell{'}Orletta, Felice  and
      Esuli, Andrea  and
      Navigli, Roberto",
    editor = "Chiruzzo, Luis  and
      Ritter, Alan  and
      Wang, Lu",
    booktitle = "Findings of the {A}ssociation for {C}omputational {L}inguistics: {NAACL} 2025",
    month = apr,
    year = "2025",
    address = "Albuquerque, New Mexico",
    publisher = "Association for Computational Linguistics",
    url = "https://aclanthology.org/2025.findings-naacl.371/",
    doi = "10.18653/v1/2025.findings-naacl.371",
    pages = "6661--6675",
    ISBN = "979-8-89176-195-7"
}
```

Paper: [ACL Anthology](https://aclanthology.org/2025.findings-naacl.371/) · [arXiv](https://arxiv.org/abs/2504.17025) · Code: [GitHub](https://github.com/SapienzaNLP/sava) · Models: [Mistral collection](https://huggingface.co/collections/SemanticAlignment/mistral-7b-v01-adapted-679243206cec8a21f75435dd) · [Llama collection](https://huggingface.co/collections/SemanticAlignment/llama-31-adapted-67924314d8957c78a3e7bcaf)
