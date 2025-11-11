---
layout: post
title: "Concept-pedia: Breaking Free from ImageNet's Shadow in Multimodal AI"
date: 2025-11-05 09:00:00
description: "Concept-pedia is a massive multimodal dataset with 165K+ semantically-annotated concepts on Hugging Face. Learn how to use SigLIP models fine-tuned on Concept-10k for zero-shot visual classification beyond ImageNet. Includes Python code examples, dataset guide, and practical integration tutorials."
tags: conceptpedia concept-pedia multimodal vision-language emnlp2025 research dataset evaluation huggingface siglip zero-shot-learning image-classification babelnet semantic-annotation visual-understanding fine-grained-recognition
categories: research
giscus_comments: true
related_posts: false
thumbnail: assets/img/conceptpedia-thumbnail.png
keywords: conceptpedia, concept-pedia, hugging face conceptpedia, concept 10k dataset, siglip conceptpedia, multimodal learning, vision-language models, EMNLP 2025, semantic annotation, image classification, zero-shot classification, fine-grained visual recognition, imagenet alternative, babelnet visual concepts, concept-10k huggingface, sapienzanlp, visual concept dataset, how to use conceptpedia, conceptpedia tutorial, conceptpedia python, multimodal dataset huggingface
author: Andrei Stefan Bejgu
---

## TL;DR - Why You Should Care

Look, I'm going to be straight with you: most vision-language models are living in an ImageNet bubble, and **Concept-pedia** proves it.

We built a massive dataset with **165,000+ semantically-annotated concepts** and found something wild - models that supposedly achieve "human-level" performance on standard benchmarks completely fall apart when you test them on real-world visual diversity.

**What we're releasing:**

- **165K+ concepts** from BabelNet with rich semantic structure (all on Hugging Face)
- **Concept-10k**: Our manually-verified benchmark with 10,000 diverse visual concepts
- **Three fine-tuned SigLIP models** ready to use for zero-shot classification
- **Everything is open**: Free for research and commercial use

**The bottom line:** If your ImageNet accuracy is 80% but your Concept-10k score is 45%, you don't have a general vision model - you have an ImageNet classifier. Time to fix that.

---

## The ImageNet Problem

For over a decade, **ImageNet** has been the gold standard for computer vision. Its 1,000 categories became THE benchmark everyone optimized for.

But here's the thing: **the real world doesn't have just 1,000 visual concepts**.

Try asking state-of-the-art models about concepts outside ImageNet's distribution and watch what happens. That model bragging about 85% ImageNet accuracy? It'll confidently tell you a Bombay cat is just a "black cat" and an Allen wrench is a "screwdriver." Not great when you're building real applications.

We're not talking about obscure edge cases here. These are everyday objects that humans recognize instantly. The problem? The entire field has been optimizing for a test that doesn't reflect reality.

## Our EMNLP 2025 Research

I'm thrilled to share our paper **"Concept-pedia: A Wide-coverage Semantically-annotated Multimodal Dataset"**, published at **EMNLP 2025** - the Conference on Empirical Methods in Natural Language Processing.

<div class="alert alert-info" role="alert" style="background-color: #cfe2ff !important; border: 2px solid #084298 !important; color: #084298 !important;">
<strong style="color: #084298 !important;">📄 Published at EMNLP 2025</strong><br>
<strong style="color: #084298 !important;">Authors:</strong> Karim Ghonim, Andrei Stefan Bejgu, Alberte Fernández-Castro, Roberto Navigli<br>
<strong style="color: #084298 !important;">Affiliations:</strong> Sapienza University of Rome & Babelscape<br><br>
📄 <a href="https://aclanthology.org/2025.emnlp-main.1745/" style="color: #084298 !important; font-weight: bold;">Read the paper at ACL Anthology</a><br>
📊 <a href="https://aclanthology.org/2025.emnlp-main.1745.pdf" style="color: #084298 !important;">Download PDF</a>
</div>

## What Makes Concept-pedia Different?

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/conceptpedia-examples.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Examples of taxonomical concept population in Concept-pedia across different categories (Cat, Emotion, Church, Pasta, Macaque, Train) showing the rich semantic structure from BabelNet.
</div>

### Massive Scale with Semantic Structure

**165,000+ concepts** organized through BabelNet's rich semantic network:

- **Not just labels**: Every concept has definitions, relations, and multilingual support
- **Semantic hierarchy**: Concepts are organized by meaningful relationships
- **Real-world diversity**: Far beyond ImageNet's 1K categories

### Concept-10k: A Rigorous Benchmark

We created **Concept-10k**, a manually-curated evaluation benchmark:

- **10,000 diverse visual concepts**
- **Human-verified quality**
- **Balanced across semantic categories**
- **Designed to test real-world generalization**

### Semantic Annotations

Unlike raw image-text pairs, every concept includes:

- **Precise definitions**
- **Semantic relationships** (hypernymy, meronymy, etc.)
- **Multilingual coverage**
- **Structured knowledge graph integration**

## The ImageNet Anchor Problem

Our experiments reveal a critical issue: **modern vision-language models are heavily anchored to ImageNet**.

### Performance Drop Beyond ImageNet

When we evaluate state-of-the-art models on Concept-10k:

| Model           | ImageNet Performance | Concept-10k Performance | Drop       |
| --------------- | -------------------- | ----------------------- | ---------- |
| CLIP (ViT-L/14) | 75.5%                | 42.3%                   | **-33.2%** |
| ALIGN           | 76.4%                | 43.8%                   | **-32.6%** |
| OpenCLIP        | 78.2%                | 45.1%                   | **-33.1%** |

**Performance drops by over 30 points** when tested on diverse concepts!

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/conceptpedia-comparison.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Comparison of concept and category distributions: Concept-10k covers 28 semantic categories with 9,837 unique concepts, far exceeding ImageNet-1k's 11 categories and 1,000 concepts. The distribution is more balanced across diverse categories.
</div>

### Why Does This Happen?

- **Training data bias**: Most vision-language models are trained on data distributions similar to ImageNet
- **Evaluation myopia**: We've been testing on the same narrow distribution for years
- **False sense of progress**: High benchmark scores don't reflect real-world capability

## Real-World Examples

Let's see where models fail:

### Example 1: Specialized Tools

**Concept**: "Allen wrench" (a specific type of hex key)

- **Human**: Easily recognizes the L-shaped tool
- **CLIP**: Confuses with "wrench", "screwdriver", "key"
- **Why it fails**: Too specific, not in ImageNet's 1K categories

### Example 2: Fine-grained Animals

**Concept**: "Bombay cat" (a specific cat breed)

- **Human**: Recognizes the sleek black coat
- **Model**: Just says "cat" or "black cat"
- **Why it fails**: ImageNet has "Egyptian cat" but lacks fine-grained breeds

### Example 3: Cultural Objects

**Concept**: "Takoyaki pan" (Japanese cooking equipment)

- **Human**: Recognizes the specialized griddle with hemispheric molds
- **Model**: Confuses with "pan", "griddle", "muffin tin"
- **Why it fails**: Cultural specificity beyond Western-centric training data

These aren't edge cases - they're everyday objects that humans recognize instantly.

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/conceptpedia-annotation-examples.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Examples showing the annotation quality in Concept-pedia: correct annotations are verified by expert linguists, while ambiguous cases are carefully filtered out (e.g., distinguishing "church" from "altar" when both appear in the same image).
</div>

## How We Built Concept-pedia

### Concept Selection from BabelNet

We leveraged **BabelNet**, the largest multilingual semantic network:

- Started with **165,000+ visual concepts**
- Filtered for concepts with clear visual representations
- Ensured semantic diversity across categories
- Maintained rich semantic annotations

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/conceptpedia-link-propagation.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Link propagation examples: Our methodology uses Wikipedia hyperlinks and BabelNet's semantic structure to automatically annotate images with precise concepts, ensuring high-quality annotations at scale.
</div>

### Image Collection

For each concept:

- Query multiple image sources
- Automatic quality filtering
- Diversity checks (pose, lighting, context)
- Deduplication

### Manual Curation for Concept-10k

For the evaluation benchmark:

- **Human verification**: Expert annotators verified every image
- **Quality control**: Multiple rounds of checking
- **Balance**: Ensured representation across semantic categories
- **Difficulty calibration**: Mix of easy, medium, hard examples

## Key Findings

### The ImageNet Anchor Effect is Real

Models perform dramatically worse on concepts outside ImageNet's distribution, even when those concepts aren't more visually complex.

### Semantic Annotations Help

Models that leverage semantic structure (like our approach) show better generalization than pure vision-language pretraining.

### Fine-grained Understanding Lags

Modern models struggle most with:

- **Fine-grained categories** (specific breeds, species, types)
- **Cultural specificity** (region-specific objects)
- **Specialized domains** (medical instruments, technical equipment)

### More Data Isn't Enough

Simply scaling up training data on similar distributions doesn't solve the problem. We need **semantic diversity**, not just more examples.

## Why This Matters for Practitioners

If you're building multimodal AI systems, you need to know:

### Benchmark Scores Can Mislead

A model with 80% accuracy on ImageNet might have 45% accuracy on real-world visual concepts. **Test on diverse data**, not just standard benchmarks.

### Domain Adaptation is Critical

If your application involves:

- Specialized domains (medical, industrial, etc.)
- Cultural diversity
- Fine-grained recognition

Standard vision-language models will likely underperform. Consider:

- **Domain-specific fine-tuning**
- **Semantic augmentation** with knowledge graphs
- **Evaluation on relevant concepts**, not just ImageNet

### Semantic Structure Helps

Incorporating semantic knowledge (definitions, relationships, hierarchies) improves generalization. Don't rely purely on image-text correlation.

## The Research Impact

Concept-pedia enables:

### Better Evaluation

Researchers can now test models on **165K+ concepts** beyond ImageNet, getting a true sense of generalization capability.

### Improved Training

Use Concept-pedia's semantic annotations to train models with better conceptual understanding.

### Diagnostic Analysis

Concept-10k allows detailed analysis of where and why models fail, guiding future improvements.

### Multilingual Extension

BabelNet's multilingual nature enables extension to non-English visual understanding.

## What We're Working On Next

We're actively developing:

- **Concept-pedia v2**: Expanding to 500K+ concepts
- **Video concepts**: Temporal understanding beyond static images
- **3D concepts**: Spatial reasoning and object understanding
- **Interactive evaluation platform**: Test your models on Concept-10k
- **Semantic-aware training methods**: Leveraging structure for better learning

## The Bigger Picture

**Concept-pedia** is part of a broader movement toward **semantic understanding** in AI.

We've spent a decade optimizing for ImageNet. It's time to:

- **Evaluate on real diversity** - not just benchmark performance
- **Incorporate semantic knowledge** - not just pattern matching
- **Test on long-tail concepts** - not just common categories
- **Build for the real world** - not just academic benchmarks

## The Research Team

This work was a collaborative effort:

- **Karim Ghonim** (Lead - Sapienza University)
- **Andrei Stefan Bejgu** (Sapienza University & Babelscape)
- **Alberte Fernández-Castro** (Sapienza University)
- **Roberto Navigli** (Babelscape & Sapienza University)

Presented at **EMNLP 2025** in Suzhou, China.

## Getting Started with Concept-pedia on Hugging Face

The entire Concept-pedia ecosystem is now available on Hugging Face, making it dead simple to use these models and datasets in your own projects. Whether you're training a new vision-language model, evaluating your existing system, or just exploring the dataset, here's everything you need to know.

### What's Available on Hugging Face

We've released three fine-tuned SigLIP models and two comprehensive datasets:

**Models (Vision-Language):**
- `sapienzanlp/siglip-base-patch16-256-ft-concept-pedia` (0.2B params) - Fast and efficient
- `sapienzanlp/siglip-large-patch16-256-ft-concept-pedia` (0.7B params) - Better accuracy
- `sapienzanlp/siglip-so400m-patch14-384-ft-concept-pedia` (0.9B params) - Best performance

**Datasets:**
- `sapienzanlp/Concept-10k` - Text annotations and metadata (34.3K concepts)
- `sapienzanlp/Concept-10k-imgs` - Full image dataset with visual content (4.26 GB)

All models are trained on the full Concept-pedia dataset, giving them knowledge of 165K+ visual concepts beyond traditional ImageNet categories.

### Quick Start: Using the Models

Here's how to get started with zero-shot image classification using our models. This example shows you how to classify an image into one of several possible concepts:

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

The beauty of this approach? You can test **any visual concept** you want, not just the 1,000 categories in ImageNet. Want to distinguish between types of pasta, breeds of dogs, or specific tools? Just change the `candidate_concepts` list.

### Why These Models Are Different

Most vision-language models suffer from the "ImageNet anchor" problem we discussed earlier - they're great at recognizing common objects but fall apart on specialized or fine-grained concepts. Our models were specifically trained to handle:

- **Fine-grained categories**: Not just "cat" but specific breeds like "Bombay cat" or "Scottish Fold"
- **Specialized domains**: Medical equipment, industrial tools, architectural elements
- **Cultural diversity**: Objects and concepts from different cultures and regions
- **Long-tail concepts**: Rare but real-world concepts that traditional models miss

### Working with the Concept-10k Dataset

The dataset comes in two flavors - one with just metadata and one with images. Here's how to load and explore them:

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

Each entry includes:
- **concept**: The specific visual concept (e.g., "Allen wrench", "Bombay cat")
- **category**: Semantic category (ARTIFACT, ANIMAL, FOOD, etc.)
- **caption**: Natural language description
- **bn_id**: BabelNet ID for linking to semantic knowledge
- **image**: The visual content (in Concept-10k-imgs)

### Exploring the Image Dataset

For the full visual experience with images:

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

The image dataset is about 4.26 GB, so it might take a few minutes to download the first time. After that, it's cached locally.

### Real-World Usage Examples

#### Example 1: Building a Fine-Grained Visual Search

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

#### Example 2: Evaluating Your Own Model

Use Concept-10k as a benchmark to test how well your model handles diverse concepts:

```python
from datasets import load_dataset
from tqdm import tqdm

def evaluate_on_concept10k(your_model, your_processor):
    """Evaluate any vision-language model on Concept-10k"""

    # Load test set
    dataset = load_dataset("sapienzanlp/Concept-10k-imgs")
    test_data = dataset['train']

    correct = 0
    total = 0

    # Group by concept for efficiency
    from collections import defaultdict
    concept_groups = defaultdict(list)

    for i, example in enumerate(test_data):
        concept = dataset['test'][i]['concept']
        concept_groups[concept].append((example['jpg'], i))

    # Test each concept
    for concept, examples in tqdm(concept_groups.items()):
        for img, idx in examples:
            # Your model's prediction logic here
            prediction = your_model.predict(img)

            if prediction == concept:
                correct += 1
            total += 1

    accuracy = correct / total
    print(f"Accuracy on Concept-10k: {accuracy:.2%}")
    return accuracy
```

#### Example 3: Dataset Analysis

Want to understand what's in the dataset? Here's a quick analysis script:

```python
from datasets import load_dataset
from collections import Counter
import matplotlib.pyplot as plt

# Load dataset
dataset = load_dataset("sapienzanlp/Concept-10k")
test_data = dataset['test']

# Analyze categories
categories = [ex['category'] for ex in test_data]
category_counts = Counter(categories)

# Plot distribution
plt.figure(figsize=(12, 6))
plt.bar(category_counts.keys(), category_counts.values())
plt.xticks(rotation=45, ha='right')
plt.title('Concept Distribution across Categories')
plt.xlabel('Category')
plt.ylabel('Number of Concepts')
plt.tight_layout()
plt.savefig('concept_distribution.png')

# Find longest concepts
concepts = [ex['concept'] for ex in test_data]
longest = sorted(concepts, key=len, reverse=True)[:10]

print("Longest concept names:")
for i, concept in enumerate(longest, 1):
    print(f"  {i}. {concept} ({len(concept)} chars)")

# Category breakdown
print(f"\nTotal categories: {len(category_counts)}")
print(f"Total concepts: {len(test_data)}")
print(f"Average concepts per category: {len(test_data) / len(category_counts):.1f}")
```

### Understanding the Dataset Structure

The Concept-10k dataset has **34,345 rows** across 28 semantic categories:

- **ARTIFACT**: Man-made objects, tools, equipment
- **FOOD**: Dishes, ingredients, cuisines
- **ANIMAL (ANIM)**: Species, breeds, wildlife
- **PLANT**: Flora, trees, botanical specimens
- **LOCATION (LOC)**: Places, landmarks, geographic features
- **STRUCTURE (STRUCT)**: Buildings, architectural elements
- **PERSON (PER)**: Occupations, roles, archetypes
- **ORGANIZATION (ORG)**: Companies, institutions
- **DISEASE (DIS)**: Medical conditions
- **SUBSTANCE (SUB)**: Materials, chemicals
- **MEDIA**: Art forms, entertainment
- **RELATION**: Social connections
- **GROUP**: Collections, teams
- **MEASURE**: Units, quantification
- **ASSET**: Resources, valuables
- **DISCIPLINE**: Fields of study
- **PART**: Components, pieces
- **BIO**: Biological entities
- ...and more

Each concept includes a BabelNet ID (`bn_id`), which links it to a vast multilingual knowledge graph. This means you can:
- Explore semantic relationships (hypernyms, hyponyms, meronyms)
- Get definitions in multiple languages
- Connect concepts to Wikipedia, WordNet, and other resources

### Performance Tips

**Model Selection:**
- Use the **base model** (0.2B) for real-time applications or when speed matters
- Use the **large model** (0.7B) for better accuracy in production systems
- Use the **SO400M model** (0.9B) when you need the absolute best performance

**Dataset Loading:**
- The text dataset (Concept-10k) is only a few MB - fast to download
- The image dataset (Concept-10k-imgs) is 4.26 GB - use streaming for memory efficiency:

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

**Inference Optimization:**
- Batch multiple images together for faster processing
- Use GPU if available: `model.to("cuda")`
- Cache the processor and model instead of reloading

### Why Use Concept-pedia for Your Project?

Stop using ImageNet-trained models for everything. Seriously. Here's when Concept-pedia is the better choice:

1. **Your domain isn't well-covered by ImageNet**: Building a medical diagnosis tool? Industrial quality inspection system? Cultural heritage preservation app? ImageNet won't cut it.

2. **You need fine-grained recognition**: If distinguishing between a Golden Retriever and a Labrador matters, or you need to tell apart a cappuccino from a flat white, you need fine-grained understanding.

3. **You want actual zero-shot capability**: Not "zero-shot on similar stuff to training data" but real zero-shot - throw any concept at it and get reasonable results.

4. **You're building multilingual systems**: BabelNet integration means your visual concepts come with multilingual support out of the box.

5. **You care about real-world diversity**: ImageNet is super Western-centric. If you're building for global users, you need concepts from different cultures.

6. **You want semantic grounding**: Connecting visual concepts to knowledge graphs unlocks explainability, reasoning, and integration with other AI systems.

### Common Pitfalls and How to Avoid Them

**Pitfall 1: Testing on ImageNet after training on Concept-pedia**

If you fine-tune on Concept-pedia and then evaluate on ImageNet, you might see a performance drop. That's expected! Concept-pedia is designed for broader coverage, not ImageNet-specific optimization.

**Solution**: Evaluate on Concept-10k or your specific domain, not ImageNet.

**Pitfall 2: Using too many candidate concepts at once**

The models work best with 10-100 candidate concepts per query. If you have 10,000+ concepts, consider using a retrieval stage first.

**Solution**: Use semantic search or clustering to narrow down candidates before classification.

**Pitfall 3: Assuming perfect accuracy on rare concepts**

Even our models struggle with extremely rare or ambiguous visual concepts. They're better than ImageNet-anchored models, but not perfect.

**Solution**: Use confidence thresholds and human-in-the-loop verification for critical applications.

### Integration with Popular Frameworks

**LangChain Integration:**
```python
from langchain.tools import Tool
from transformers import AutoModel, AutoProcessor

def create_concept_classifier_tool():
    model = AutoModel.from_pretrained(
        "sapienzanlp/siglip-base-patch16-256-ft-concept-pedia"
    )
    processor = AutoProcessor.from_pretrained(
        "sapienzanlp/siglip-base-patch16-256-ft-concept-pedia"
    )

    def classify(image_path: str, concepts: str) -> str:
        # concepts should be comma-separated
        concept_list = [c.strip() for c in concepts.split(',')]
        # ... classification logic ...
        return result

    return Tool(
        name="ConceptClassifier",
        func=classify,
        description="Classifies images into fine-grained visual concepts"
    )
```

**FastAPI Endpoint:**
```python
from fastapi import FastAPI, File, UploadFile
from typing import List
import torch

app = FastAPI()

# Load model at startup
@app.on_event("startup")
async def load_model():
    app.state.model = AutoModel.from_pretrained(
        "sapienzanlp/siglip-base-patch16-256-ft-concept-pedia"
    )
    app.state.processor = AutoProcessor.from_pretrained(
        "sapienzanlp/siglip-base-patch16-256-ft-concept-pedia"
    )

@app.post("/classify")
async def classify_image(
    file: UploadFile = File(...),
    concepts: List[str] = ["cat", "dog", "bird"]
):
    # Read image
    image_bytes = await file.read()
    image = Image.open(BytesIO(image_bytes))

    # Classify
    inputs = app.state.processor(
        text=concepts,
        images=image,
        return_tensors="pt",
        padding=True
    )

    with torch.no_grad():
        outputs = app.state.model(**inputs)
        probs = outputs.logits_per_image.softmax(dim=1)[0]

    results = {
        concept: float(prob)
        for concept, prob in zip(concepts, probs)
    }

    return {"predictions": results}
```

## Access the Dataset and Models

Everything is freely available for research and commercial use:

**Hugging Face Resources:**
- 🤗 Models: [sapienzanlp on Hugging Face](https://huggingface.co/sapienzanlp)
- 🤗 Datasets: [Concept-10k](https://huggingface.co/datasets/sapienzanlp/Concept-10k) & [Concept-10k-imgs](https://huggingface.co/datasets/sapienzanlp/Concept-10k-imgs)

**Paper:**
- 📄 [ACL Anthology](https://aclanthology.org/2025.emnlp-main.1745/)
- 📄 [Download PDF](https://aclanthology.org/2025.emnlp-main.1745.pdf)

## Implications for Multimodal AI

### For Researchers

- **New benchmark**: Evaluate on Concept-10k for real-world generalization
- **Training resource**: Use semantic annotations for better learning
- **Analysis tool**: Diagnose model failures on specific concept types

### For Practitioners

- **Reality check**: Test your models beyond ImageNet
- **Semantic augmentation**: Incorporate structured knowledge
- **Domain awareness**: Understand limitations before deployment

### For the Field

- **Shift in evaluation**: Move beyond ImageNet-centric metrics
- **Semantic integration**: Combine vision with knowledge graphs
- **Long-tail focus**: Address real-world diversity

## Conclusion

For years, we've been **optimizing for the wrong target**. High performance on ImageNet doesn't mean real-world visual understanding.

**Concept-pedia** provides:

- **165K+ semantically-annotated concepts** for training
- **Concept-10k benchmark** for rigorous evaluation
- **Evidence** that current models are more limited than we thought
- **A path forward** through semantic integration

It's time to break free from ImageNet's shadow and build multimodal AI that truly understands the visual world's diversity.

---

## Citation

If you use Concept-pedia in your research, please cite our paper:

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

**Plain text citation:**

> Karim Ghonim, Andrei Stefan Bejgu, Alberte Fernández-Castro, and Roberto Navigli. 2025. Concept-pedia: A Wide-coverage Semantically-annotated Multimodal Dataset. In Proceedings of the 2025 Conference on Empirical Methods in Natural Language Processing, pages 34405–34426, Suzhou, China. Association for Computational Linguistics.

---

_Published at EMNLP 2025 - Conference on Empirical Methods in Natural Language Processing, Suzhou, China_

_Built with ❤️ by Andrei Stefan Bejgu - AI Applied Scientist @ [SylloTips](https://syllotips.com)_
