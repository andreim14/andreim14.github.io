---
layout: post
title: "Concept-pedia and Concept-10k: test your vision-language model beyond ImageNet (EMNLP 2025)"
date: 2025-11-05 09:00:00
last_modified_at: 2026-11-11 12:00:00
description: "Concept-10k is a human-validated benchmark of 9,837 visual concepts in 28 semantic categories. SigLIP-SO400M scores 83.2% on ImageNet-1k and 40.3% on Concept-10k. How the dataset was built from Wikipedia and BabelNet, how to evaluate your own model on it in a few lines, and how to cite it."
tags: conceptpedia multimodal vision-language emnlp2025 research dataset benchmark huggingface siglip babelnet
categories: research
keywords: Concept-pedia, Concept-10k, vision-language benchmark, zero-shot image classification, SigLIP, CLIP, ImageNet alternative, BabelNet, Wikipedia image captions, visual concept recognition, EMNLP 2025
author: Andrei Stefan Bejgu
---

**Concept-10k** is a benchmark for one question: does your vision-language model recognise concepts outside ImageNet? It has **9,837 concepts across 28 semantic categories**, each checked by two expert linguists. Models that look excellent on ImageNet do not hold up on it: SigLIP-SO400M goes from **83.2% top-1 on ImageNet-1k to 40.3% on Concept-10k**.

It comes from **Concept-pedia**, a training set of 165K concepts built automatically from Wikipedia image captions and the BabelNet taxonomy. Fine-tuning on it adds **5.2 points** on Concept-10k on average, without losing ImageNet-1k accuracy.

| | |
|---|---|
| Paper | [Concept-pedia: a Wide-coverage Semantically-annotated Multimodal Dataset](https://aclanthology.org/2025.emnlp-main.1745/), EMNLP 2025 |
| Authors | Karim Ghonim, Andrei Stefan Bejgu, Alberte Fernández-Castro, Roberto Navigli (Sapienza University of Rome, Babelscape) |
| Benchmark | [`sapienzanlp/Concept-10k`](https://huggingface.co/datasets/sapienzanlp/Concept-10k) on Hugging Face, one `test` split |
| Fine-tuned models | [`sapienzanlp`](https://huggingface.co/sapienzanlp) SigLIP base, large and SO400M, fine-tuned on Concept-pedia |
| Use it for | zero-shot image classification evals, long-tail and abstract concepts, per-category error analysis |

## Evaluate your model on Concept-10k

Each row is one image with the concept it shows, its BabelNet id and its semantic category:

```python
{"id": "147_000015482", "caption": "Bipartite patella", "concept": "patella",
 "bn_id": "bn:00049315n", "category": "PART", "image": <PIL.Image>}
```

Zero-shot evaluation works like the paper's: embed every concept name and every image in the same space, predict the concept with the highest similarity, report top-1 accuracy. This script does that for any SigLIP or CLIP checkpoint on Hugging Face:

```python
# pip install torch transformers datasets   (tested with transformers 5.22)
import torch
from datasets import load_dataset
from transformers import AutoModel, AutoProcessor

model_id = "google/siglip-base-patch16-224"   # or any CLIP / SigLIP checkpoint
device = "cuda" if torch.cuda.is_available() else "cpu"
model = AutoModel.from_pretrained(model_id).to(device).eval()
processor = AutoProcessor.from_pretrained(model_id)

ds = load_dataset("sapienzanlp/Concept-10k", split="test")
concepts = sorted(set(ds["concept"]))
names = [c.replace("_", " ") for c in concepts]      # "dangerous_goods" -> "dangerous goods"
index = {c: i for i, c in enumerate(concepts)}

def unit(x):
    # transformers >= 5 returns an output object, older versions a tensor
    x = x if torch.is_tensor(x) else x.pooler_output
    return torch.nn.functional.normalize(x, dim=-1)

with torch.no_grad():
    text = []
    for i in range(0, len(names), 512):
        t = processor(text=names[i:i + 512], padding="max_length", truncation=True, return_tensors="pt").to(device)
        text.append(unit(model.get_text_features(**t)))
    text = torch.cat(text)

    correct = 0
    for i in range(0, len(ds), 64):
        batch = ds[i:i + 64]
        px = processor(images=[im.convert("RGB") for im in batch["image"]], return_tensors="pt").to(device)
        img = unit(model.get_image_features(**px))
        pred = (img @ text.T).argmax(dim=-1).tolist()
        correct += sum(p == index[c] for p, c in zip(pred, batch["concept"]))

print(f"Concept-10k top-1: {correct / len(ds):.1%}")
```

The label space is every concept in the benchmark (about 9.8K candidates), which is what makes it hard. To compare against the paper's numbers, use the same models; the public release has 34,345 rows, so small differences from the paper's tables are expected. Group the predictions by `category` to see where a model breaks, which is usually more useful than the single number.

To classify your own images, the fine-tuned checkpoints drop into the standard zero-shot pipeline:

```python
from transformers import pipeline

clf = pipeline("zero-shot-image-classification",
               model="sapienzanlp/siglip-base-patch16-256-ft-concept-pedia")
clf("photo.jpg", candidate_labels=["moka pot", "french press", "espresso machine"])
```

## Results

<figure class="chart" role="img" aria-label="Top-1 accuracy on ImageNet-1k versus Concept-10k for six models; every model loses 38 to 49 points."><svg viewBox="0 0 680 316" width="100%" preserveAspectRatio="xMidYMid meet"><g class="ch-legend" font-size="12"><circle cx="190" cy="16" r="6" class="ch-a"/><text x="202" y="20">ImageNet-1k</text><circle cx="310" cy="16" r="6" class="ch-b"/><text x="322" y="20">Concept-10k</text></g><line x1="190.0" x2="190.0" y1="40" y2="276" class="ch-grid"/><text x="190.0" y="310" class="ch-tick" text-anchor="middle">0%</text><line x1="306.5" x2="306.5" y1="40" y2="276" class="ch-grid"/><text x="306.5" y="310" class="ch-tick" text-anchor="middle">25%</text><line x1="423.0" x2="423.0" y1="40" y2="276" class="ch-grid"/><text x="423.0" y="310" class="ch-tick" text-anchor="middle">50%</text><line x1="539.5" x2="539.5" y1="40" y2="276" class="ch-grid"/><text x="539.5" y="310" class="ch-tick" text-anchor="middle">75%</text><line x1="656.0" x2="656.0" y1="40" y2="276" class="ch-grid"/><text x="656.0" y="310" class="ch-tick" text-anchor="middle">100%</text><g class="ch-row"><title>CLIP-B: ImageNet-1k 68.3%, Concept-10k 22.0% (-46.3 points)</title><rect x="0" y="40" width="680" height="34" class="ch-hit"/><text x="176" y="60" text-anchor="end" class="ch-label">CLIP-B</text><line x1="292.5" x2="508.3" y1="56" y2="56" class="ch-stem"/><circle cx="508.3" cy="56" r="6" class="ch-a"/><circle cx="292.5" cy="56" r="6" class="ch-b"/><text x="518.3" y="60" class="ch-val">68.3</text><text x="282.5" y="60" text-anchor="end" class="ch-val">22.0</text></g><g class="ch-row"><title>CLIP-L: ImageNet-1k 75.5%, Concept-10k 26.7% (-48.8 points)</title><rect x="0" y="80" width="680" height="34" class="ch-hit"/><text x="176" y="100" text-anchor="end" class="ch-label">CLIP-L</text><line x1="314.4" x2="541.8" y1="96" y2="96" class="ch-stem"/><circle cx="541.8" cy="96" r="6" class="ch-a"/><circle cx="314.4" cy="96" r="6" class="ch-b"/><text x="551.8" y="100" class="ch-val">75.5</text><text x="304.4" y="100" text-anchor="end" class="ch-val">26.7</text></g><g class="ch-row"><title>SigLIP-B: ImageNet-1k 76.2%, Concept-10k 31.1% (-45.1 points)</title><rect x="0" y="120" width="680" height="34" class="ch-hit"/><text x="176" y="140" text-anchor="end" class="ch-label">SigLIP-B</text><line x1="334.9" x2="545.1" y1="136" y2="136" class="ch-stem"/><circle cx="545.1" cy="136" r="6" class="ch-a"/><circle cx="334.9" cy="136" r="6" class="ch-b"/><text x="555.1" y="140" class="ch-val">76.2</text><text x="324.9" y="140" text-anchor="end" class="ch-val">31.1</text></g><g class="ch-row"><title>SigLIP-L: ImageNet-1k 80.5%, Concept-10k 36.1% (-44.4 points)</title><rect x="0" y="160" width="680" height="34" class="ch-hit"/><text x="176" y="180" text-anchor="end" class="ch-label">SigLIP-L</text><line x1="358.2" x2="565.1" y1="176" y2="176" class="ch-stem"/><circle cx="565.1" cy="176" r="6" class="ch-a"/><circle cx="358.2" cy="176" r="6" class="ch-b"/><text x="575.1" y="180" class="ch-val">80.5</text><text x="348.2" y="180" text-anchor="end" class="ch-val">36.1</text></g><g class="ch-row"><title>SigLIP-SO400M: ImageNet-1k 83.2%, Concept-10k 40.3% (-42.9 points)</title><rect x="0" y="200" width="680" height="34" class="ch-hit"/><text x="176" y="220" text-anchor="end" class="ch-label">SigLIP-SO400M</text><line x1="377.8" x2="577.7" y1="216" y2="216" class="ch-stem"/><circle cx="577.7" cy="216" r="6" class="ch-a"/><circle cx="377.8" cy="216" r="6" class="ch-b"/><text x="587.7" y="220" class="ch-val">83.2</text><text x="367.8" y="220" text-anchor="end" class="ch-val">40.3</text></g><g class="ch-row"><title>SigLIP-SO400M, fine-tuned: ImageNet-1k 83.0%, Concept-10k 45.0% (-38.0 points)</title><rect x="0" y="240" width="680" height="34" class="ch-hit"/><text x="176" y="260" text-anchor="end" class="ch-label">SigLIP-SO400M, fine-tuned</text><line x1="399.7" x2="576.8" y1="256" y2="256" class="ch-stem"/><circle cx="576.8" cy="256" r="6" class="ch-a"/><circle cx="399.7" cy="256" r="6" class="ch-b"/><text x="586.8" y="260" class="ch-val">83.0</text><text x="389.7" y="260" text-anchor="end" class="ch-val">45.0</text></g></svg><figcaption>Top-1 accuracy (%), Table 5 of the paper. Every model loses 38 to 49 points moving from ImageNet-1k to Concept-10k; fine-tuning on Concept-pedia narrows the gap without hurting ImageNet.</figcaption></figure>

The full numbers, including ImageNet-v2. "Fine-tuned" means trained on Concept-pedia with all Concept-10k images removed first.

| Model | Params | ImageNet-1k | ImageNet-v2 | Concept-10k |
|---|---|---|---|---|
| CLIP-B | 150M | 68.3 | 61.9 | 22.0 |
| CLIP-L | 428M | 75.5 | 69.0 | 26.7 |
| SigLIP-B | 203M | 76.2 | 69.6 | 31.1 |
| SigLIP-B, fine-tuned | 203M | 75.9 | 69.1 | **36.1** |
| SigLIP-L | 652M | 80.5 | 74.2 | 36.1 |
| SigLIP-L, fine-tuned | 652M | 79.3 | 73.5 | **41.9** |
| SigLIP-SO400M | 878M | 83.2 | 77.2 | 40.3 |
| SigLIP-SO400M, fine-tuned | 878M | 83.0 | 76.7 | **45.0** |

Three things to take from it:

- **The drop is about which concepts you test, not image quality.** On Concept-1k, the slice of Concept-pedia restricted to ImageNet's 1,000 classes, human annotators judged labels correct 95.7% of the time against 88.4% for ImageNet itself. Models still score lower there (SigLIP-large: 87.6% on ImageNet vs 83.0% on Concept-1k), the same pattern as ImageNet-v2. New concepts, not bad data, cause the gap.
- **Abstract and specialised categories are the weak spot.** Even after fine-tuning, SigLIP-SO400M sits at 23.1% on law, 24.1% on psychology and 26.0% on measures, against 71.9% on animals (Table 7).
- **Fine-tuning helps everywhere it matters and costs nothing on ImageNet.** +5.2 points on Concept-10k on average; ImageNet-1k accuracy moves by at most 1.2 points.

## How the data was built

The idea: Wikipedia editors have already linked millions of images to concepts by hand. Concept-pedia reuses those links instead of paying for new labels.

<figure class="flow" aria-label="How Concept-pedia and Concept-10k were built, in four steps">
<ol>
<li><b>4.6M</b><span>Wikipedia image captions (English, Nov 2023)</span></li>
<li><b>74.5%</b><span>captions linked to a concept after link propagation</span></li>
<li><b>101,354</b><span>concepts after taxonomic propagation, each with 5+ images</span></li>
<li><b>9,837</b><span>concepts in Concept-10k, 49,185 pairs checked by two linguists</span></li>
</ol>
<figcaption>From free Wikipedia annotations to a human-validated benchmark. Each arrow is one step described below.</figcaption>
</figure>

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/conceptpedia-link-propagation.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">A caption often mentions a concept without linking it, while the page body links the same term. Link propagation copies that link onto the caption.</div>

1. **Start from captions.** 4.6 million image captions from English Wikipedia (Nov 2023 dump).
2. **Link propagation.** When a caption mentions something the page body already links, copy the link onto the caption. Four matching rules, each measured on 200 samples: exact string (100% precision), lemma (91%), BabelNet synonym such as *natatorium* → *swimming pool* (96%), and Wikipedia redirect such as *Lesser Panda* → *Red Panda* (84%). Afterwards 74.5% of captions carry at least one link. Every annotation records which rule produced it, so you can keep only the high-precision ones.
3. **Taxonomic propagation.** About 85% of the links point to named entities, not concepts. Each entity is mapped to its concept through BabelNet's hypernyms (*Arrie Church* → *church*), and rare concepts move up to their parent (*Hokuto* → *train*) until every concept has at least 5 images. Precision of this step: 96%. Result: 101,354 concepts, each with 5+ images.
4. **Concept-10k.** From concepts with at least 10 images: drop captions that mention more than one concept, keep the 5 shortest captions per concept, and remove concepts that are parents of other concepts in the set (keep *race car*, drop *car*) so a correct prediction is never marked wrong. Two expert linguists then validated every image-concept pair (Cohen's κ = 89.3). Final benchmark: 49,185 image-concept pairs over 9,837 concepts.

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/conceptpedia-comparison.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">ImageNet-1k covers 11 of the 29 semantic categories; Concept-10k covers 28, including abstract ones such as events and feelings, with a more even spread.</div>

Concepts are labelled with the 29 semantic categories of CNER (Martinelli et al., 2024). That is where the `category` column comes from, and it is what makes per-category error analysis possible.

## Limitations

- Captions come only from English Wikipedia, which brings a cultural bias.
- The benchmark keeps one concept per image; real images often show several.
- Concepts were chosen by frequency, so diversity inside a category is not optimised.

## Questions people ask

**Is Concept-10k a replacement for ImageNet?** No, a complement. ImageNet tells you how well a model fits a well-studied set of 1,000 classes; Concept-10k tells you whether it generalises to the long tail.

**Why are the numbers so low?** The label space is ~9.8K concepts, many abstract or specialised, and a prediction is right only if it names exactly the annotated concept. Parents of other concepts were removed, so a more general answer does not count as wrong by accident.

**Can I train on Concept-10k?** No, it is a test set. Train on Concept-pedia (with the Concept-10k images removed, as in the paper) or on your own data, then evaluate here.

**Which fine-tuned model should I use?** `siglip-base-patch16-256-ft-concept-pedia` for speed, `siglip-so400m-patch14-384-ft-concept-pedia` for accuracy, `siglip-large-patch16-256-ft-concept-pedia` in between.

## Cite

If you use Concept-pedia, Concept-10k or the fine-tuned models, please cite:

```bibtex
@inproceedings{ghonim-etal-2025-concept,
    title = "Concept-pedia: a Wide-coverage Semantically-annotated Multimodal Dataset",
    author = "Ghonim, Karim and Bejgu, Andrei Stefan and Fern{\'a}ndez-Castro, Alberte and Navigli, Roberto",
    booktitle = "Proceedings of the 2025 Conference on Empirical Methods in Natural Language Processing",
    month = nov,
    year = "2025",
    address = "Suzhou, China",
    publisher = "Association for Computational Linguistics",
    url = "https://aclanthology.org/2025.emnlp-main.1745/",
    doi = "10.18653/v1/2025.emnlp-main.1745",
    pages = "34417--34438"
}
```

Paper: [ACL Anthology](https://aclanthology.org/2025.emnlp-main.1745/) · [PDF](https://aclanthology.org/2025.emnlp-main.1745.pdf) · Benchmark: [Concept-10k](https://huggingface.co/datasets/sapienzanlp/Concept-10k) · Models: [sapienzanlp](https://huggingface.co/sapienzanlp)
