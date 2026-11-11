---
layout: post
title: "Continual pretraining of Minerva-7B, an Italian LLM: data recipes, 16K context and instruction tuning (CLiC-it 2025)"
date: 2025-11-10 09:00:00
last_modified_at: 2026-11-11 12:00:00
description: "We continually pretrained Minerva-7B on three data recipes (47.9B, 92B and 116B tokens) and extended its context from 4,096 to 16,384 tokens. Math data lifted GSM8K from 14.70 to 34.42, copyrighted books helped only on literary text, and the 16K model reached 25.9 METEOR on the new Italian INDAQA benchmark."
tags: llm minerva continual-pretraining italian clicit2025 research fine-tuning
categories: research
keywords: continual pretraining, continued pretraining, Minerva, Minerva-7B, Italian LLM, Italian language model, data mixture, data recipe, context extension, long context, RoPE base frequency, rope_theta, instruction tuning, SFT, TULU 3, INDAQA, narrative question answering, ITA-Bench, Sapienza NLP, Babelscape, CLiC-it 2025
author: Andrei Stefan Bejgu
---

We took **Minerva-7B**, a fully open LLM pretrained from scratch on a corpus that is 50% Italian and 50% English, and continued its training on three different data mixtures, then extended its context window from **4,096 to 16,384 tokens** and instruction-tuned every variant. What we learned: math and high-quality web data improve reasoning benchmarks, English math and copyrighted books can hurt Italian cultural knowledge, and real continued training at 16K beats only changing the RoPE frequency, by a wide margin on long Italian texts.

| | |
|---|---|
| Paper | [What We Learned from Continually Training Minerva: A Case Study on Italian](https://aclanthology.org/2025.clicit-1.72/), CLiC-it 2025 (CEUR Workshop Proceedings, pp. 760-774) |
| Authors | Luca Moroni, Tommaso Bonomo, Luca Gioffré, Lu Xu, Domenico Fedele, Leonardo Colosi, Andrei Stefan Bejgu, Alessandro Scirè, Roberto Navigli (Sapienza NLP and Babelscape) |
| Models | Starting point: Minerva-7B base. Public checkpoints on the Hub: [`sapienzanlp/Minerva-7B-base-v1.0`](https://huggingface.co/sapienzanlp/Minerva-7B-base-v1.0) and [`sapienzanlp/Minerva-7B-instruct-v1.0`](https://huggingface.co/sapienzanlp/Minerva-7B-instruct-v1.0) (Apache 2.0) |
| New benchmark | INDAQA, the first Italian narrative question answering dataset (365 books, 13,757 questions) |
| Use it for | Choosing a data mixture for continual pretraining in a language other than English, extending context length, and planning an SFT mix |

The paper notes that Recipe-1 is the continual pretraining data used for the first released version of Minerva-7B. The checkpoints for the other recipes are not listed under the `sapienzanlp` organization on the Hub at the time of writing.

## Load and try Minerva

The public model is a Mistral-architecture checkpoint (`MistralForCausalLM`, 4,096 positions, `rope_theta` 10,000). The instruct model ships a chat template, so `apply_chat_template` builds the prompt for you.

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "sapienzanlp/Minerva-7B-instruct-v1.0"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.bfloat16, device_map="auto")

messages = [{"role": "user", "content": "Chi ha scritto I promessi sposi? Rispondi in una frase."}]
inputs = tokenizer.apply_chat_template(
    messages, add_generation_prompt=True, return_tensors="pt", return_dict=True
).to(model.device)

out = model.generate(**inputs, max_new_tokens=128, do_sample=False)
print(tokenizer.decode(out[0, inputs["input_ids"].shape[1]:], skip_special_tokens=True))
```

## What is continual pretraining and when to do it

Continual pretraining means taking a model that has already finished its first pretraining run and training it further with the same next-token objective, usually on a smaller, higher-quality or more targeted corpus. OLMo 2 and Llama 3 call a version of this "mid-training". It is the right tool when you want to shift what the model knows (a language, a domain, fresher encyclopedic text, more math) without paying for a new pretraining run, and before you do supervised fine-tuning.

The study asks a question that had mostly been answered for English only: which data, added at this stage, actually helps a model on Italian tasks?

<figure class="flow" aria-label="The four training stages studied in the paper, from the Minerva-7B base model to instruction-tuned variants">
<ol>
<li><b>Base model</b><span>Minerva-7B, pretrained from scratch on 50% Italian and 50% English text with a 4,096-token context</span></li>
<li><b>Continual pretraining</b><span>Three recipes of 47.9B, 92B and 116B tokens, fresh AdamW optimizer, peak learning rate 1e-5</span></li>
<li><b>Context extension</b><span>Recipe-3 retrained at 16,384 tokens with the RoPE base frequency raised from 10,000 to 500,000</span></li>
<li><b>Instruction tuning</b><span>Every variant fine-tuned on a bilingual mix built on TÜLU-v3 (about 970K instructions in total)</span></li>
</ol>
<figcaption>Each continually pretrained variant goes through the same SFT stage, so differences after instruction tuning trace back to the pretraining data and context length.</figcaption>
</figure>

## The data recipes we compared

"Times" is how many times a source is repeated in the mixture (Tables 1 and 2 of the paper).

| Source | Recipe-1 | Recipe-2 | Recipe-3 |
|---|---|---|---|
| Italian benchmarks (ITA-Bench train splits) | 6.9M x 21 = 144M | 6.9M x 7 = 50M | same as Recipe-2 |
| Italian Wikipedia | 814M x 3 = 2.4B | 1.2B x 5 = 6.1B (own cleaned dump, May 2024) | same |
| RedPajama (Italian web) | 5.8B x 2 = 11.6B | 20B x 2 = 40B | same |
| Wikisource, Gazzetta Ufficiale, Gutenberg (IT) | none | 266M, 853M, 500M | same |
| English benchmarks | 55M x 5 = 275M | 55M x 5 = 275M | same |
| English Wikipedia | 2.4B x 3 = 7.3B | 7.1B x 1 | same |
| Fineweb-edu | 6B x 2 = 12B | 4.3B x 2 = 8.6B | same |
| Project Gutenberg (EN) | 1B | none | none |
| FLAN | 9.5B | 12B | same |
| Dolmino MATH / StackExchange | none | 11.7B / 1.5B | same |
| The Stack (code) | 3.3B | 2.5B | same |
| Books3 (copyrighted books) | none | none | **24B** |
| **Total** | **47.9B** | **92B** | **116B** |

Recipe-2 adds math (the Dolmino subsets used in OLMo 2's mid-training) and more Italian sources. Recipe-3 is Recipe-2 plus Books3, so comparing the two isolates the effect of copyrighted books. Appendix B lists the filters: Fineweb-edu `sample-100BT` with a quality score of at least 3.8 (Recipe-1) or 4.0 (Recipes 2 and 3), RedPajama-V2 `head` partition with texts under 500 words removed, and Stack v2 code only from repositories with at least 10 GitHub stars.

### Build a data mixture for continual pretraining

`interleave_datasets` samples from several streams with fixed probabilities. Below, the probabilities are the final token counts of Recipe-2, normalized. Sources the paper took from the Hub use their real ids; the rest are placeholders you replace with your own data.

```python
from datasets import load_dataset, interleave_datasets

def text_stream(path, name=None, split="train", min_score=None):
    ds = load_dataset(path, name, split=split, streaming=True)
    if min_score is not None:  # Fineweb-edu quality score, filtered before dropping the column
        ds = ds.filter(lambda x: x["score"] >= min_score)
    return ds.select_columns(["text"])

# (stream, final tokens in billions from Table 2, Recipe-2)
sources = [
    (text_stream("your_italian_web_corpus"), 40.0),          # paper: RedPajama-V2 Italian, 4 dumps
    (text_stream("wikimedia/wikipedia", "20231101.it"), 6.1), # paper: own cleaned May 2024 dump
    (text_stream("mii-llm/gazzetta-ufficiale"), 0.853),
    (text_stream("manu/project_gutenberg", split="it"), 0.5),
    (text_stream("wikimedia/wikisource", "20231201.it"), 0.266),
    (text_stream("HuggingFaceFW/fineweb-edu", "sample-100BT", min_score=4.0), 8.6),
    (text_stream("your_english_wikipedia"), 7.1),
    (text_stream("your_flan_text"), 12.0),                    # paper: FLAN from allenai/dolma
    (text_stream("allenai/dolmino-mix-1124", "math"), 11.7),
    (text_stream("allenai/dolmino-mix-1124", "stackexchange"), 1.5),
    (text_stream("your_code_corpus"), 2.5),                   # paper: Stack v2, repos with 10+ stars
    (text_stream("your_benchmark_train_sets"), 0.325),        # paper: ITA-Bench IT + EN train splits
]
streams, tokens = zip(*sources)
probs = [t / sum(tokens) for t in tokens]

mixture = interleave_datasets(list(streams), probabilities=probs, seed=42,
                              stopping_strategy="all_exhausted")
```

Probabilities control the share of documents, not tokens, so if your sources have very different document lengths, adjust them after measuring average tokens per document.

## How to continually pretrain an LLM

What the paper did (Section 4.1): a newly initialized AdamW optimizer, batch size 1,024 sequences of 4,096 tokens, peak learning rate 1e-5, 200 warmup steps for Recipe-1 and 600 for Recipes 2 and 3. Training ran with [LLM-Foundry](https://github.com/mosaicml/llm-foundry) on 64 NVIDIA A100 64GB GPUs across 16 nodes of the Leonardo supercomputer. Recipe-1 took 3.5 days and each of the other three runs 7 days, about 37,632 GPU-hours and 3.8 t of CO2 in total (Appendix A).

The snippet below is a **minimal recipe, not the paper's exact setup**: the same objective and the paper's learning rate, on the Hugging Face Trainer.

```python
from transformers import (AutoModelForCausalLM, AutoTokenizer, DataCollatorForLanguageModeling,
                          Trainer, TrainingArguments)

model_id = "sapienzanlp/Minerva-7B-base-v1.0"
block_size = 4096
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype="bfloat16")

def tokenize(batch):
    return tokenizer([t + tokenizer.eos_token for t in batch["text"]])

def group_texts(batch):
    # concatenate documents and cut into full blocks, dropping the remainder
    ids = sum(batch["input_ids"], [])
    n = (len(ids) // block_size) * block_size
    return {"input_ids": [ids[i:i + block_size] for i in range(0, n, block_size)]}

train = (mixture  # from the previous snippet
         .map(tokenize, batched=True, remove_columns=["text"])
         .map(group_texts, batched=True, batch_size=1000, remove_columns=["attention_mask"]))

args = TrainingArguments(
    output_dir="minerva-cpt",
    max_steps=10_000,                 # streaming datasets need max_steps
    per_device_train_batch_size=1,
    gradient_accumulation_steps=64,   # scale to your GPUs; the paper used 1,024 sequences per step
    learning_rate=1e-5,               # paper's peak learning rate
    warmup_steps=600,                 # paper: 200 (Recipe-1) or 600 (Recipes 2 and 3)
    lr_scheduler_type="cosine",
    weight_decay=0.1,
    bf16=True,
    gradient_checkpointing=True,
    logging_steps=10,
    save_steps=1000,
)

trainer = Trainer(model=model, args=args, train_dataset=train,
                  data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False))
trainer.train()
```

A low peak learning rate matters here: you are nudging a trained model, not training one, and a large rate erases what it already knows.

## How to extend the context window

The paper follows Xiong et al. (2024): Recipe-3 is trained again with the maximum context raised from 4,096 to 16,384 tokens, and the RoPE base frequency θ raised **from 10,000 to 500,000** "to accommodate the increased sequence length". To keep training dynamics comparable, the number of gradient updates stays fixed: the context is 4x longer, so the batch size is divided by 4, and each update still sees about the same number of tokens. They call this model Recipe-3<sub>16K</sub>.

As a baseline, the 4K models were adapted without training, only by setting θ = 100,000. That was not enough: at 32,768 tokens their perplexity on the answers spikes, while Recipe-3<sub>16K</sub> keeps modelling text at twice its training length.

The config change before continued training, with the paper's values:

```python
from transformers import AutoConfig, AutoModelForCausalLM

model_id = "sapienzanlp/Minerva-7B-base-v1.0"   # or your Recipe-3 checkpoint
config = AutoConfig.from_pretrained(model_id)

config.max_position_embeddings = 16_384          # was 4,096
if getattr(config, "rope_parameters", None):     # newer transformers keep RoPE settings here
    config.rope_parameters["rope_theta"] = 500_000.0
else:
    config.rope_theta = 500_000.0                # was 10,000

model = AutoModelForCausalLM.from_pretrained(model_id, config=config, torch_dtype="bfloat16")
```

Then rerun the pretraining loop with `block_size = 16384` and a quarter of the sequences per step (for example `gradient_accumulation_steps=16` instead of 64). Long sequences need FlashAttention or SDPA and gradient checkpointing to fit in memory.

## How to instruction-tune the result

Every continually pretrained model went through the same SFT stage (Section 3.3 and Table 3):

| Dataset | Language | Instructions |
|---|---|---|
| TÜLU-v3 | EN | 940,000 |
| LIMA + LIMA-IT (translated with GPT-4o-mini) | IT/EN | 2,000 |
| WildChat-IT | IT | 5,000 |
| TowerBlocks-v0.2 | IT/EN | 7,276 |
| GPT-4o-ITA-Instruct | IT | 15,000 |
| Aya | IT | 700 |

Training used [LLaMA-Factory](https://github.com/hiyouga/Llama-Factory): full fine-tuning of all 7B weights (no LoRA), bf16, two epochs, peak learning rate 1e-6 with cosine decay and 10% warmup, AdamW, an effective batch of 64 sequences (about 128K tokens), 4,096-token context (16,384 for the long-context variant).

The snippet is a **minimal recipe** with TRL. TÜLU 3's SFT mix is public as `allenai/tulu-3-sft-mixture` with a `messages` column; your own Italian examples use the same role/content format.

```python
from datasets import Dataset, concatenate_datasets, load_dataset
from transformers import AutoTokenizer
from trl import SFTConfig, SFTTrainer

# The base tokenizer has no chat template; the instruct repo's tokenizer does.
tokenizer = AutoTokenizer.from_pretrained("sapienzanlp/Minerva-7B-instruct-v1.0")
tulu = load_dataset("allenai/tulu-3-sft-mixture", split="train").select_columns(["messages"])

# Your own instructions: one conversation per row, role/content turns.
my_examples = [
    {"messages": [
        {"role": "user", "content": "Spiega in due frasi cos'è la Gazzetta Ufficiale."},
        {"role": "assistant", "content": "La Gazzetta Ufficiale è la fonte ufficiale di conoscenza delle norme "
                                         "in vigore in Italia. Pubblica leggi, decreti e altri atti dello Stato."},
    ]},
    # ... more examples; aim for varied tasks, registers and lengths
]
mine = Dataset.from_list(my_examples).cast(tulu.features)
train = concatenate_datasets([tulu, mine]).shuffle(seed=42)

# Check what the model will actually see:
print(tokenizer.apply_chat_template(my_examples[0]["messages"], tokenize=False))

args = SFTConfig(
    output_dir="minerva-sft",
    num_train_epochs=2,
    learning_rate=1e-6,               # paper's peak learning rate
    lr_scheduler_type="cosine",
    warmup_ratio=0.1,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=16,   # 64 sequences per step on one GPU, as in the paper
    max_length=4096,
    bf16=True,
    gradient_checkpointing=True,
)
trainer = SFTTrainer(model="minerva-cpt", args=args, train_dataset=train, processing_class=tokenizer)
trainer.train()
```

Using the instruct tokenizer's template for SFT means your fine-tuned model formats turns the same way as the released Minerva instruct model, so the loading snippet above works on it unchanged.

## Results

**Perplexity by genre** (Table 4, lower is better). On 51 held-out Books3 books, Recipe-3 reaches 9.57 against 11.05 for the starting model, and 8.98 when Recipe-3<sub>16K</sub> reads 16K tokens. On Italian Wikipedia all recipes improve on the base model (7.54 down to 6.72 for Recipe-3). On 2025 Italian news nothing changes much and the base model is best (10.05).

**ITA-Bench, base models** (Table 5). All recipes beat the starting model: the paper reports an average gain of about +5.0 points, from 54.88 to 59.85 for Recipe-2, the best, followed by Recipe-3<sub>16K</sub> at 59.57. MMLU rises by about 15 points (25.45 to 41.63 at best). Recipe-1, the one without math, is weakest on ARC and GSM8K.

**Math** (Table 6). GSM8K (8-shot) goes from 14.70 with Recipe-1 to 34.42 with Recipe-2 on base models, and from 24.63 to 42.45 after instruction tuning. MATH (4-shot) goes from 2.48 to 9.57 on base models; after SFT the gap narrows (10.14 vs 12.84).

**Italian culture** (Table 7). Here the order flips. Recipe-1 is the best model on MultiLoKo Italian (F1 0.27 zero-shot, 0.29 five-shot) and on ITALIC-GEN (METEOR 0.24 and 0.27), ahead of the Italian-specific and English-first baselines tested. Recipe-2 drops to F1 0.16 zero-shot.

**Long context** (Table 9, after instruction tuning, METEOR):

<figure class="chart" role="img" aria-label="METEOR on INDAQA Italian narrative QA with book texts truncated at 16K and 32K tokens. Recipe-1 17.3 and 11.1. Recipe-2 12.2 and 7.3. Recipe-3 13.5 and 8.3. Recipe-3 16K 25.9 and 26.0. occiglot-7b-it-en 19.9 and 19.9. Llama-3.1-8B 24.9 and 29.3.">
<svg viewBox="0 0 680 316" width="100%" preserveAspectRatio="xMidYMid meet">
<g font-size="12"><rect x="190" y="10" width="12" height="12" rx="3" class="ch-a"/><text x="208" y="20">Book truncated at 16K tokens</text><rect x="440" y="10" width="12" height="12" rx="3" class="ch-b"/><text x="458" y="20">Book truncated at 32K tokens</text></g>
<g>
<line x1="190" x2="190" y1="46" y2="292" class="ch-grid"/>
<line x1="345.3" x2="345.3" y1="46" y2="292" class="ch-grid"/>
<line x1="500.7" x2="500.7" y1="46" y2="292" class="ch-grid"/>
<line x1="656" x2="656" y1="46" y2="292" class="ch-grid"/>
<text x="190" y="308" text-anchor="middle" class="ch-tick">0</text>
<text x="345.3" y="308" text-anchor="middle" class="ch-tick">10</text>
<text x="500.7" y="308" text-anchor="middle" class="ch-tick">20</text>
<text x="656" y="308" text-anchor="middle" class="ch-tick">30</text>
</g>
<g class="ch-row"><title>Recipe-1 (4K): 17.3 METEOR at 16K, 11.1 at 32K</title><text x="176" y="75" text-anchor="end" class="ch-label">Recipe-1 (4K)</text><rect x="190" y="54" width="268.7" height="15" rx="4" class="ch-a"/><text x="464.7" y="66" class="ch-val">17.3</text><rect x="190" y="71" width="172.4" height="15" rx="4" class="ch-b"/><text x="368.4" y="83" class="ch-val">11.1</text></g>
<g class="ch-row"><title>Recipe-2 (4K): 12.2 METEOR at 16K, 7.3 at 32K</title><text x="176" y="115" text-anchor="end" class="ch-label">Recipe-2 (4K)</text><rect x="190" y="94" width="189.5" height="15" rx="4" class="ch-a"/><text x="385.5" y="106" class="ch-val">12.2</text><rect x="190" y="111" width="113.4" height="15" rx="4" class="ch-b"/><text x="309.4" y="123" class="ch-val">7.3</text></g>
<g class="ch-row"><title>Recipe-3 (4K): 13.5 METEOR at 16K, 8.3 at 32K</title><text x="176" y="155" text-anchor="end" class="ch-label">Recipe-3 (4K)</text><rect x="190" y="134" width="209.7" height="15" rx="4" class="ch-a"/><text x="405.7" y="146" class="ch-val">13.5</text><rect x="190" y="151" width="128.9" height="15" rx="4" class="ch-b"/><text x="324.9" y="163" class="ch-val">8.3</text></g>
<g class="ch-row"><title>Recipe-3 16K: 25.9 METEOR at 16K, 26.0 at 32K</title><text x="176" y="195" text-anchor="end" class="ch-label">Recipe-3 16K</text><rect x="190" y="174" width="402.3" height="15" rx="4" class="ch-a"/><text x="598.3" y="186" class="ch-val">25.9</text><rect x="190" y="191" width="403.9" height="15" rx="4" class="ch-b"/><text x="599.9" y="203" class="ch-val">26.0</text></g>
<g class="ch-row"><title>occiglot-7b-it-en-instruct (32K context): 19.9 METEOR at 16K, 19.9 at 32K</title><text x="176" y="235" text-anchor="end" class="ch-label">occiglot-7b-it-en (32K)</text><rect x="190" y="214" width="309.1" height="15" rx="4" class="ch-a"/><text x="505.1" y="226" class="ch-val">19.9</text><rect x="190" y="231" width="309.1" height="15" rx="4" class="ch-b"/><text x="505.1" y="243" class="ch-val">19.9</text></g>
<g class="ch-row"><title>Llama-3.1-8B (128K context): 24.9 METEOR at 16K, 29.3 at 32K</title><text x="176" y="275" text-anchor="end" class="ch-label">Llama-3.1-8B (128K)</text><rect x="190" y="254" width="386.8" height="15" rx="4" class="ch-a"/><text x="582.8" y="266" class="ch-val">24.9</text><rect x="190" y="271" width="455.1" height="15" rx="4" class="ch-b"/><text x="651.1" y="283" class="ch-val">29.3</text></g>
</svg>
<figcaption>INDAQA rows of Table 9, instruction-tuned models. Recipe-3 16K is the best model tested at 16K tokens and holds its score at 32K, where the 4K Minerva variants lose 4.9 to 6.2 points.</figcaption>
</figure>

Against Recipe-1, Recipe-3<sub>16K</sub> gains 8.6 METEOR on INDAQA and 7.7 on NarrativeQA at 16K tokens, and 14.9 and 17.3 at 32K. On English NarrativeQA it scores 21.4 and 20.5, behind Llama-3.1-8B (24.0, 28.7) and Mistral-7B-v0.3 (21.7, 25.6).

## Lessons learned

These are the paper's own conclusions:

- **Continual pretraining helps across the board** on Italian benchmarks, with high-quality web data (Wikipedia, Fineweb-edu) and synthetic or instruction-like data (FLAN, Dolmino-MATH) driving the gains.
- **Math data is what moves math benchmarks.** With Dolmino-MATH in the mix, Recipe-2 beats Recipe-1 on English GSM8K and MATH and on the Italian ARC and GSM8K tasks of ITA-Bench.
- **Copyrighted books are not a consistent win.** Books3 lowers perplexity on literary text but does not improve downstream scores over Recipe-2.
- **English-heavy additions can cost cultural knowledge.** English math and English books lowered scores on Italian culture tasks, and Recipe-1 stayed the most culturally aligned.
- **Multiple-choice QA is a weak test of cultural competence**; the open-ended ITALIC-GEN reformulation gives a complementary view, and it confirms the MultiLoKo trend.
- **Train at the longer context, do not just rescale RoPE.** Frequency tuning alone breaks down at 32K tokens; continued training at 16K does not.

## Limitations

- The study covers one 7B model and one language pair, so the recipe effects may not transfer as-is to other sizes or languages.
- Recipes differ in more than one source at a time (Recipe-2 changes Wikipedia, RedPajama, Fineweb-edu and adds math), so only the Recipe-2 vs Recipe-3 comparison isolates a single factor (Books3).
- Books3 is no longer publicly available, so Recipe-3 cannot be reproduced exactly.
- Long-context evaluation truncates books at 16K or 32K tokens, so some questions lose the passage they need (equally for all models). INDAQA questions and answers were generated by LLMs from summaries and filtered with regular expressions; manual checks covered 17 documents (646 QA pairs).
- On GSM8K the Minerva models still lag behind closed-data models of the same size (Qwen3-8B reaches 87.86, against 42.45 for the best Minerva instruct model).

## Questions people ask

**How many tokens do you need for continual pretraining?** The paper's recipes use 47.9B, 92B and 116B tokens on a 7B model. Recipe-1, the smallest, already raised the ITA-Bench average from 54.88 to 57.68.

**What learning rate should I use for continual pretraining?** The paper used a peak of 1e-5 with a fresh AdamW optimizer and 200 to 600 warmup steps, and 1e-6 for full-parameter SFT.

**How do I extend an LLM's context from 4K to 16K?** Raise the maximum positions to 16,384 and the RoPE base frequency from 10,000 to 500,000, then continue pretraining at the new length while dividing the batch size by 4 to keep tokens per update constant.

**Is changing rope_theta without training enough?** Not in this study. The 4K models with θ = 100,000 show perplexity spikes at 32K tokens and score 7.3 to 11.1 METEOR on INDAQA at 32K, against 26.0 for the model trained at 16K.

**Does adding English data hurt an Italian LLM?** For cultural knowledge it can: the recipes with English math and books scored lower on MultiLoKo Italian and ITALIC-GEN than Recipe-1. For math, the same English data helped.

**What is INDAQA?** An Italian narrative QA benchmark built from the Italian split of Echoes from Alexandria: 365 books from Wikisource with summaries, 13,757 questions with up to five reference answers, average book length 27K tokens.

## Cite

```bibtex
@inproceedings{moroni-etal-2025-learned,
    title = "What We Learned from Continually Training Minerva: A Case Study on {I}talian",
    author = "Moroni, Luca  and
      Bonomo, Tommaso  and
      Gioffr{\'e}, Luca  and
      Xu, Lu  and
      Fedele, Domenico  and
      Colosi, Leonardo  and
      Bejgu, Andrei Stefan  and
      Scir{\`e}, Alessandro  and
      Navigli, Roberto",
    editor = "Bosco, Cristina  and
      Jezek, Elisabetta  and
      Polignano, Marco  and
      Sanguinetti, Manuela",
    booktitle = "Proceedings of the Eleventh {I}talian Conference on Computational Linguistics ({CL}i{C}-it 2025)",
    month = sep,
    year = "2025",
    address = "Cagliari, Italy",
    publisher = "CEUR Workshop Proceedings",
    url = "https://aclanthology.org/2025.clicit-1.72/",
    pages = "760--774",
    ISBN = "979-12-243-0587-3"
}
```

Paper: [ACL Anthology](https://aclanthology.org/2025.clicit-1.72/) · [PDF](https://aclanthology.org/2025.clicit-1.72.pdf) · [Babelscape](https://babelscape.com/research/publication/what-we-learned-from-continually-training-minerva-a-case-study-on-italian) · Models: [Minerva-7B base](https://huggingface.co/sapienzanlp/Minerva-7B-base-v1.0) · [Minerva-7B instruct](https://huggingface.co/sapienzanlp/Minerva-7B-instruct-v1.0)
