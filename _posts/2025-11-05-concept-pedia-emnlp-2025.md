---
layout: post
title: "Concept-pedia: A Multimodal Concept Dataset and Benchmark Beyond ImageNet (EMNLP 2025)"
date: 2025-11-05 09:00:00
description: "Concept-pedia is a wide-coverage, semantically-annotated multimodal dataset of 165K+ visual concepts built on BabelNet, with the Concept-10k benchmark and SigLIP models on Hugging Face for evaluating vision-language models beyond ImageNet."
tags: conceptpedia multimodal vision-language emnlp2025 research dataset benchmark huggingface siglip babelnet
categories: research
giscus_comments: true
related_posts: true
thumbnail: assets/img/conceptpedia-thumbnail.png
keywords: concept-pedia, concept-10k, vision-language dataset, SigLIP, BabelNet, EMNLP 2025, ImageNet alternative, zero-shot image classification, fine-grained recognition, multimodal benchmark
author: Andrei Stefan Bejgu
---

## TL;DR

**Concept-pedia** is a wide-coverage, semantically-annotated multimodal dataset of **165,000+ visual concepts** built on [BabelNet](https://babelnet.org/), designed for training and evaluating vision-language models on far more than ImageNet's 1,000 categories. It ships with **Concept-10k**, a human-verified evaluation benchmark, and three fine-tuned [SigLIP](https://huggingface.co/docs/transformers/model_doc/siglip) models on Hugging Face.

- **Paper:** [Concept-pedia: A Wide-coverage Semantically-annotated Multimodal Dataset](https://aclanthology.org/2025.emnlp-main.1745/), EMNLP 2025 (Main)
- **Authors:** Karim Ghonim, Andrei Stefan Bejgu, Alberte Fernández-Castro, Roberto Navigli (Sapienza University of Rome and Babelscape)
- **Models:** [sapienzanlp on Hugging Face](https://huggingface.co/sapienzanlp) (SigLIP base, large, SO400M)
- **Datasets:** [Concept-10k](https://huggingface.co/datasets/sapienzanlp/Concept-10k) and [Concept-10k-imgs](https://huggingface.co/datasets/sapienzanlp/Concept-10k-imgs)
- **Key finding:** State-of-the-art vision-language models drop **30+ points** from ImageNet to Concept-10k.

## The problem: ImageNet is a narrow test

For over a decade, [ImageNet](https://image-net.org/) and its 1,000 categories have been the default benchmark for computer vision. Models are trained on ImageNet-like distributions and then evaluated on ImageNet, or on benchmarks that are close variants of it.

The real world has far more than 1,000 visual concepts. Ask a state-of-the-art model about anything outside that distribution and the gaps show: a Bombay cat gets labeled "black cat", an Allen wrench gets called a "screwdriver". These are not obscure edge cases. They are everyday objects that people recognize instantly, and they fall outside the categories most models were optimized for.

High ImageNet accuracy has given the field a false sense of progress. A model that scores 85% on ImageNet can still fail to tell a moka pot from a french press. Concept-pedia measures that gap directly.

## What Concept-pedia is

Concept-pedia is built on top of BabelNet, the largest multilingual semantic network. Every concept carries a definition, relationships to other concepts, and multilingual mappings, rather than a bare image-label pair. A concept exists inside a web of human knowledge, and the dataset keeps that structure attached.

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/conceptpedia-examples.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Examples of taxonomical concept population in Concept-pedia across categories, showing the semantic structure inherited from BabelNet.
</div>

Three properties set it apart from typical image-text datasets:

- **Scale and diversity:** 165,000+ concepts, from specific cat breeds to architectural elements to types of pasta, not the same 1,000 ImageNet categories in different poses.
- **Semantic annotations:** hypernymy (is-a), meronymy (part-of), and links to Wikipedia and WordNet, so models can reason about concept hierarchies instead of only pattern-matching pixels to tokens.
- **A verified benchmark:** Concept-10k, curated and checked by expert annotators to test whether models understand visual concepts or memorized ImageNet.

### Concept-10k: the evaluation benchmark

Concept-10k is the manually-curated evaluation subset: diverse, human-verified concepts spanning the full range of semantic categories, with balanced difficulty from easy to genuinely hard. Every image was verified across multiple rounds of expert review, checking not just "is this the right label?" but "is this a good, unambiguous example?"

The full released Concept-10k dataset covers 28 semantic categories and 9,837 unique concepts, against ImageNet-1k's 11 categories and 1,000 concepts.

## The ImageNet anchor: results

When we evaluate state-of-the-art vision-language models on Concept-10k, performance collapses.

| Model           | ImageNet | Concept-10k | Drop       |
| --------------- | -------- | ----------- | ---------- |
| CLIP (ViT-L/14) | 75.5%    | 42.3%       | **-33.2%** |
| ALIGN           | 76.4%    | 43.8%       | **-32.6%** |
| OpenCLIP        | 78.2%    | 45.1%       | **-33.1%** |

Performance drops by more than 30 points on diverse concepts. The failing concepts are not visually harder than ImageNet categories: a Bombay cat is no harder to recognize than an Egyptian cat. The model just never learned to make the distinction.

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/conceptpedia-comparison.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Concept and category distributions: Concept-10k covers 28 semantic categories with 9,837 unique concepts, against ImageNet-1k's 11 categories and 1,000 concepts, with a more balanced spread.
</div>

### Where models fail

| Concept                | Human                           | Model                                        | Why it fails                                              |
| ---------------------- | ------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| Allen wrench (hex key) | Recognizes the L-shaped tool    | Confuses with "wrench", "screwdriver", "key" | Too specific, not in ImageNet's 1K categories             |
| Bombay cat (breed)     | Recognizes the sleek black coat | Outputs "cat" or "black cat"                 | ImageNet has "Egyptian cat" but lacks fine-grained breeds |

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/conceptpedia-annotation-examples.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Annotation quality in Concept-pedia: correct annotations are verified by expert linguists, and ambiguous cases are filtered out (for example, distinguishing "church" from "altar" when both appear in one image).
</div>

## How Concept-pedia was built

### Filtering BabelNet for visual concepts

BabelNet spans millions of concepts across hundreds of languages, but not all of them are visual ("democracy" is hard to photograph). Starting from the full knowledge graph, we kept concepts with clear visual representations, which left 165,000+ concepts across animals, architecture, food, and specialized tools. The semantic annotations (definitions, relationships, multilingual mappings, Wikipedia links) were preserved throughout.

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/conceptpedia-link-propagation.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Link propagation: the methodology uses Wikipedia hyperlinks and BabelNet's semantic structure to automatically annotate images with precise concepts at scale.
</div>

### Human verification for Concept-10k

For the evaluation benchmark, automation was not enough. Expert annotators verified every image across the benchmark concepts over multiple review rounds, and difficulty was calibrated deliberately, from easy concepts (a golden retriever) to hard ones (distinguishing between types of wrenches).

## What the results show

- **The ImageNet anchor is real.** Models do not degrade gracefully on unfamiliar concepts, they fail outright, and not because those concepts are visually harder.
- **Semantic structure helps generalization.** Models that use the knowledge graph, with concept relationships and hierarchies, generalize better than pure image-text pretraining.
- **Fine-grained recognition is the weak point.** Specific breeds, variants of the same tool, region-specific cultural objects, and technical or medical equipment are where models collapse to the nearest generic category.
- **Scale alone is not the fix.** Adding more examples from the same distribution does not close the gap. Semantic diversity does. A million more images labeled "dog" teaches nothing about specific breeds.

## Using the models and datasets

The full ecosystem is on Hugging Face: three fine-tuned SigLIP models and two datasets.

**Models (vision-language):**

- `sapienzanlp/siglip-base-patch16-256-ft-concept-pedia` (0.2B params): fastest
- `sapienzanlp/siglip-large-patch16-256-ft-concept-pedia` (0.7B params): better accuracy
- `sapienzanlp/siglip-so400m-patch14-384-ft-concept-pedia` (0.9B params): best performance

**Datasets:**

- `sapienzanlp/Concept-10k`: text annotations and metadata (34.3K concepts)
- `sapienzanlp/Concept-10k-imgs`: full image dataset (4.26 GB)

All models are trained on the full Concept-pedia dataset, giving them coverage of 165K+ visual concepts beyond ImageNet categories.

### Zero-shot image classification

```python
from transformers import AutoModel, AutoProcessor
from PIL import Image
import torch

# Load the base model (fastest option)
model_name = "sapienzanlp/siglip-base-patch16-256-ft-concept-pedia"
processor = AutoProcessor.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

# Load your image
image = Image.open("your_image.jpg")

# Define candidate concepts - can be anything!
candidate_concepts = [
    "Bombay cat",
    "Persian cat",
    "Siamese cat",
    "Maine Coon cat",
    "tabby cat"
]

# Process the inputs
inputs = processor(
    text=candidate_concepts,
    images=image,
    return_tensors="pt",
    padding=True
)

# Get predictions
with torch.no_grad():
    outputs = model(**inputs)
    logits = outputs.logits_per_image
    probs = logits.softmax(dim=1)

# Print results
print("Classification results:")
for concept, prob in zip(candidate_concepts, probs[0]):
    print(f"  {concept}: {prob.item():.1%}")
```

You can test any visual concept, not just ImageNet's 1,000 categories. To classify types of pasta, breeds of dog, or specific tools, change the `candidate_concepts` list. Because the models were trained on the full 165K concept distribution rather than optimized for ImageNet, they distinguish specific cat breeds (Bombay vs Persian vs Scottish Fold), handle specialized domains (medical equipment, industrial tools, architectural elements), recognize culturally-specific objects, and work with long-tail concepts. They are not perfect, but they are substantially better on real-world diversity than ImageNet-anchored models.

### Loading the Concept-10k dataset

```python
from datasets import load_dataset

# Load the text/metadata dataset (lightweight)
dataset = load_dataset("sapienzanlp/Concept-10k")

# Look at the first example
example = dataset['test'][0]
print(f"Concept: {example['concept']}")
print(f"Category: {example['category']}")
print(f"Caption: {example['caption']}")
print(f"BabelNet ID: {example['bn_id']}")
```

Each entry includes the concept name, its semantic category (ARTIFACT, ANIMAL, FOOD, and so on), a natural-language caption, and a BabelNet ID that links back to the full knowledge graph. The image dataset adds the visual content.

### Exploring the image dataset

```python
from datasets import load_dataset
from PIL import Image

# Load the image dataset
img_dataset = load_dataset("sapienzanlp/Concept-10k-imgs")

# Browse examples
for i in range(5):
    example = img_dataset['train'][i]

    # Access the image
    img = example['jpg']

    # Show or save it
    img.show()  # Opens in default viewer
    # Or save: img.save(f"concept_{i}.jpg")

    print(f"Image {i}: {example['__key__']}")
```

The image dataset is about 4.26 GB, so the first download takes a few minutes and is then cached locally. If you are memory-constrained, stream it:

```python
# Stream large dataset without downloading everything
dataset = load_dataset("sapienzanlp/Concept-10k-imgs", streaming=True)

# Process in batches
from itertools import islice

batch_size = 100
for batch in islice(dataset['train'], 0, batch_size):
    # Process batch
    pass
```

### Fine-grained visual search

```python
from transformers import AutoModel, AutoProcessor
from PIL import Image
import torch
from pathlib import Path

def find_similar_concepts(query_image_path, concept_database):
    """
    Find the most similar concepts to a query image.

    Args:
        query_image_path: Path to query image
        concept_database: List of concept names to search

    Returns:
        Ranked list of (concept, score) tuples
    """
    # Load model
    model_name = "sapienzanlp/siglip-base-patch16-256-ft-concept-pedia"
    processor = AutoProcessor.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)

    # Load image
    image = Image.open(query_image_path)

    # Process
    inputs = processor(
        text=concept_database,
        images=image,
        return_tensors="pt",
        padding=True
    )

    # Get scores
    with torch.no_grad():
        outputs = model(**inputs)
        scores = outputs.logits_per_image[0].softmax(dim=0)

    # Rank results
    results = sorted(
        zip(concept_database, scores.tolist()),
        key=lambda x: x[1],
        reverse=True
    )

    return results

# Example usage
concepts = [
    "espresso machine", "coffee grinder", "french press",
    "moka pot", "pour over coffee maker", "cold brew maker"
]

results = find_similar_concepts("kitchen_appliance.jpg", concepts)

print("Top 3 matches:")
for concept, score in results[:3]:
    print(f"  {concept}: {score:.1%}")
```

### Which model to pick

Choose by requirement: the base model (0.2B params) is fast enough for real-time use, the large model (0.7B) trades speed for accuracy in production, and the SO400M model (0.9B) is for the best accuracy when inference speed is not the constraint. For inference, batch your images, use a GPU where available (`model.to("cuda")`), and cache the processor and model instead of reloading them per request.

### Common pitfalls

- **Testing on ImageNet after fine-tuning on Concept-pedia.** Expect a drop on ImageNet; the dataset targets broad coverage, not ImageNet-specific optimization. Evaluate on Concept-10k or your own domain instead.
- **Too many candidate concepts per query.** The models work best with 10 to 100 candidates. For larger label sets, add a retrieval or clustering stage to narrow candidates first.
- **Assuming perfect accuracy on rare concepts.** The models still struggle with extremely rare or ambiguous concepts. Use confidence thresholds and human-in-the-loop review for critical applications.

## When to use Concept-pedia

- **Your domain is not covered by ImageNet:** medical diagnosis, industrial inspection, cultural heritage, e-commerce with diverse products.
- **You need fine-grained recognition:** Golden Retriever vs Labrador, cappuccino vs flat white.
- **You want real zero-shot capability** on arbitrary concepts, not just near-distribution ones.
- **You are building multilingual systems:** BabelNet integration provides multilingual concept support out of the box.
- **You care about real-world diversity:** ImageNet is Western-centric; global applications need concepts from different cultures.

## FAQ

**What is Concept-pedia?**
A wide-coverage, semantically-annotated multimodal dataset of 165,000+ visual concepts built on BabelNet, for training and evaluating vision-language models beyond ImageNet's 1,000 categories.

**What is Concept-10k?**
The human-verified evaluation benchmark released with Concept-pedia. It covers 28 semantic categories and 9,837 unique concepts, curated to test real-world visual generalization rather than ImageNet memorization.

**How is it different from ImageNet?**
ImageNet has 1,000 categories across about 11 semantic categories. Concept-10k covers 28 categories and thousands of unique concepts, with semantic annotations (hypernymy, meronymy, Wikipedia and WordNet links) attached to each concept.

**How much do models drop from ImageNet to Concept-10k?**
More than 30 points. CLIP (ViT-L/14) drops 33.2%, ALIGN 32.6%, and OpenCLIP 33.1% between the two benchmarks.

**Which model should I use?**
The SigLIP base model (0.2B) for speed, large (0.7B) for a speed and accuracy balance, and SO400M (0.9B) for the best accuracy. All are on Hugging Face under `sapienzanlp`.

**Where can I get the dataset and models?**
On Hugging Face: [Concept-10k](https://huggingface.co/datasets/sapienzanlp/Concept-10k), [Concept-10k-imgs](https://huggingface.co/datasets/sapienzanlp/Concept-10k-imgs), and the [sapienzanlp](https://huggingface.co/sapienzanlp) models.

**Where was it published?**
At EMNLP 2025 (Main), the Conference on Empirical Methods in Natural Language Processing, held in Suzhou, China.

## Resources

- **Paper:** [ACL Anthology](https://aclanthology.org/2025.emnlp-main.1745/)
- **PDF:** [Download](https://aclanthology.org/2025.emnlp-main.1745.pdf)
- **Models:** [sapienzanlp on Hugging Face](https://huggingface.co/sapienzanlp)
- **Datasets:** [Concept-10k](https://huggingface.co/datasets/sapienzanlp/Concept-10k) and [Concept-10k-imgs](https://huggingface.co/datasets/sapienzanlp/Concept-10k-imgs)
- **BabelNet:** [babelnet.org](https://babelnet.org/)

## Citation

```bibtex
@inproceedings{ghonim-etal-2025-conceptpedia,
    title     = "Concept-pedia: A Wide-coverage Semantically-annotated Multimodal Dataset",
    author    = "Ghonim, Karim and
                 Bejgu, Andrei Stefan and
                 Fern{\'a}ndez-Castro, Alberte and
                 Navigli, Roberto",
    booktitle = "Proceedings of the 2025 Conference on Empirical Methods in Natural Language Processing",
    month     = nov,
    year      = "2025",
    address   = "Suzhou, China",
    publisher = "Association for Computational Linguistics",
    url       = "https://aclanthology.org/2025.emnlp-main.1745/",
    pages     = "34405--34426",
}
```

> Karim Ghonim, Andrei Stefan Bejgu, Alberte Fernández-Castro, and Roberto Navigli. 2025. Concept-pedia: A Wide-coverage Semantically-annotated Multimodal Dataset. In Proceedings of the 2025 Conference on Empirical Methods in Natural Language Processing, pages 34405-34426, Suzhou, China. Association for Computational Linguistics.
