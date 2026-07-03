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

For over a decade, **[ImageNet](https://image-net.org/)** has been the gold standard for computer vision. Its 1,000 categories became THE benchmark everyone optimized for.

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

### We're talking 165,000+ concepts with actual semantic structure

Unlike most datasets that just throw images and labels together, we built Concept-pedia on top of [BabelNet](https://babelnet.org/) - the world's largest multilingual semantic network. What does that mean practically? Every single concept comes with definitions, relationships to other concepts, and support for multiple languages. It's not "here's a picture, here's what we think it is" - it's "here's a concept that exists in a web of human knowledge, and here's what it looks like."

And we're not talking about 1,000 ImageNet categories repeated in different poses. We have concepts ranging from specific cat breeds to architectural elements to types of pasta you've probably never heard of.

### Concept-10k: The benchmark we actually tested on

Creating a huge dataset is one thing. Making sure it's actually useful? That's different. We manually went through and curated Concept-10k - 10,000 concepts that are diverse, human-verified, and designed to test whether models actually understand visual concepts or just memorized ImageNet.

We had expert annotators verify every single image. Multiple rounds. We made sure the difficulty was balanced (mix of easy, medium, and genuinely hard examples) and that we covered the full range of semantic categories. This isn't a toy benchmark - when models fail here, it tells you something real about their limitations.

### The semantic annotations are what make this powerful

Most vision-language datasets give you image-text pairs. Cool. We give you that PLUS the semantic relationships. Hypernymy (is-a relationships), meronymy (part-of relationships), connections to Wikipedia, WordNet, you name it.

This isn't just for show - having this structure means you can actually reason about concepts, not just pattern match. Your model can understand that a "Bombay cat" is a type of "cat" which is a type of "feline" which is a type of "mammal." Try doing that with [CLIP](https://openai.com/index/clip/) trained on web-scraped captions.

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

Three words: we've been lazy. Well, not lazy exactly - but we've been optimizing for the wrong thing for so long that nobody questioned it.

Most vision-language models get trained on data that looks suspiciously like ImageNet. Maybe the images come from the web instead of Flickr, but the distribution? Pretty similar. Common objects. Western-centric. Same biases, bigger scale.

Then we evaluate on... ImageNet. Or benchmarks that are basically "ImageNet but slightly different." We've been testing on variations of the same exam for a decade, and then acting surprised when our models can't handle concepts outside that narrow bubble.

The real problem? Those impressive benchmark scores gave everyone a false sense of progress. "Look, we hit 85% on ImageNet!" Cool, but can your model tell a moka pot from a french press? Because my grandma can, and she's never seen a neural network in her life.

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

### Starting with BabelNet's semantic goldmine

BabelNet is massive - we're talking about millions of concepts across hundreds of languages. But not every concept is visual. "Democracy"? Great concept, hard to photograph. So we had to filter.

We started with their full knowledge graph and pulled out concepts that actually have clear visual representations. Things you can point a camera at. That still left us with 165,000+ concepts spanning everything from animals to architecture to food to specialized tools.

The key was maintaining the semantic annotations through this process. We didn't just want labels - we wanted the full context: definitions, relationships, multilingual mappings, connections to Wikipedia. All of it.

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid path="assets/img/conceptpedia-link-propagation.png" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Link propagation examples: Our methodology uses Wikipedia hyperlinks and BabelNet's semantic structure to automatically annotate images with precise concepts, ensuring high-quality annotations at scale.
</div>

### Getting the images right

Finding images for 165,000 concepts isn't trivial. We queried multiple sources for each concept, then hit them with automatic quality filters (blurry images? Gone. Watermarks everywhere? Nope.). We checked for diversity too - different angles, lighting conditions, contexts. Nobody wants a cat breed dataset where every photo is a professional studio shot.

Deduplication was huge. The internet loves copying the same image everywhere, so we had to be aggressive about catching duplicates.

### The human touch for Concept-10k

For the evaluation benchmark, automation wasn't enough. We brought in expert annotators and had them verify every single image across 10,000 concepts. Multiple rounds of review. We weren't just checking "is this the right label?" - we were checking "is this actually a good example? Is it ambiguous? Would a human struggle with this?"

We also calibrated difficulty. Some concepts are easy (most people can spot a golden retriever). Some are hard (distinguishing between types of wrenches requires domain knowledge). The benchmark needed both.

## What We Actually Learned

### The ImageNet anchor is real, and it's worse than we thought

Remember those 30+ point drops in performance? That's not a bug, it's the whole point. Models don't just perform "a bit worse" on unfamiliar concepts - they completely faceplant. And here's the kicker: the concepts they're failing on aren't even more visually complex than ImageNet categories. A Bombay cat isn't harder to recognize than an Egyptian cat. The model just never learned to care about that distinction.

### Semantic structure actually matters (who knew?)

When we compared models that use semantic annotations vs pure vision-language pretraining, the difference was clear. Having access to the knowledge graph - understanding that concepts have relationships and hierarchies - legitimately helps with generalization.

It's almost like... treating visual understanding as part of broader knowledge helps you understand things better? Shocking, I know.

### Fine-grained recognition is where everything falls apart

If there's one thing that consistently breaks modern vision models, it's fine-grained understanding. Specific dog breeds? Nope. Different types of the same tool? Forget it. Region-specific cultural objects? Not a chance.

Medical instruments, technical equipment, subspecies of animals - these are all areas where models basically give up and output the closest generic category they know. It's like asking someone who only studied from flashcards to handle nuance. They can't.

### Scaling isn't the solution (sorry, big tech)

I know the instinct is "just add more data" but that's not it. We tested this. Throwing more examples of the same distribution at the problem doesn't fix the fundamental issue.

What you need is semantic diversity, not scale. A million more images of "dog" doesn't teach your model about specific breeds if all those images are labelled "dog." You need the structure, the relationships, the actual understanding that different concepts exist and matter.

## If You're Building Multimodal AI, Pay Attention

### Your benchmark scores are lying to you

That CLIP model you're using that claims 80% ImageNet accuracy? In your specific domain, it might be sitting at 45%. Or worse.

I've seen people deploy models in production based purely on ImageNet scores, then act shocked when the thing can't tell medical instruments apart or consistently fails on region-specific products. Test on data that actually looks like what you'll see in production, not the same academic benchmarks everyone else uses.

### Domain adaptation isn't optional anymore

If you're working in healthcare, industrial inspection, e-commerce with diverse products, cultural heritage - basically anything that isn't "generic web images" - you need to assume standard models will underperform.

Fine-tuning helps, but it's not magic. You're still building on a foundation that fundamentally doesn't understand fine-grained distinctions. Better approach? Start with models that have semantic grounding (like ours) or invest in seriously good domain-specific data collection.

And for the love of god, evaluate on YOUR concepts, not ImageNet. Your stakeholders don't care if the model knows "Egyptian cat" when your actual use case needs to distinguish between different manufacturing defects.

### Semantic structure is your friend

Image-text correlation can only get you so far. When you incorporate actual semantic knowledge - hierarchies, relationships, definitions - generalization improves dramatically.

Think about it: if your model knows that "Siamese cat" is-a "cat" is-a "feline" is-a "mammal," it can reason about things it's never seen. Without that structure, it's just pattern matching pixels to tokens and hoping for the best.

## What This Enables (And Where We're Going)

Concept-pedia isn't just a dataset - it's a different way of thinking about visual understanding.

**For researchers**, it means you can finally test your models on something other than ImageNet variants. 165K+ concepts spanning actual diversity. When your model fails, Concept-10k tells you exactly where and why - fine-grained categories? Cultural concepts? Specialized domains? You'll know.

And because everything's grounded in BabelNet, you can extend to multilingual scenarios without starting from scratch. The semantic structure is already there.

**For training**, the semantic annotations are the real value. Instead of just feeding models image-text pairs and hoping they figure out relationships, you can give them the structure directly. "This is a Bombay cat, which is a type of cat, which is a feline..." The hierarchy matters.

### What's next for us

We're expanding to 500K+ concepts for v2. We're also working on temporal understanding (video concepts, not just static images) and spatial reasoning (3D object understanding).

We're building an interactive evaluation platform so you can test your own models on Concept-10k without downloading everything. And we're developing semantic-aware training methods that actually leverage the knowledge graph instead of just including it as metadata.

### The bigger point

Look, the field spent a decade optimizing for ImageNet. Can't blame anyone - it was the benchmark we had, and it drove real progress. But we've reached the point where ImageNet performance and real-world capability have diverged so much that the benchmark is actively misleading.

Concept-pedia is our push to evaluate on actual diversity, incorporate semantic knowledge instead of just pattern matching, and build for real-world deployment instead of academic leaderboards. The visual world has way more than 1,000 concepts. Our models should too.

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

Remember that ImageNet anchor problem? Our models were trained specifically to avoid it. Instead of optimizing for ImageNet's 1,000 categories, we trained on the full 165K concept distribution.

This means they can actually distinguish between specific cat breeds (Bombay cat vs Persian cat vs Scottish Fold), handle specialized domains (medical equipment, industrial tools, architectural elements), recognize culturally-specific objects, and work with long-tail concepts that most models have never seen.

They're not perfect - nothing is - but they're substantially better at real-world diversity than models anchored to ImageNet.

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

Each entry includes the concept name ("Allen wrench", "Bombay cat", whatever), its semantic category (ARTIFACT, ANIMAL, FOOD, etc.), a natural language caption describing it, and a BabelNet ID that links it to the full knowledge graph. The image dataset adds the actual visual content.

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

The full Concept-10k dataset has 34,345 rows spread across 28 semantic categories. We're talking artifacts (tools, equipment), food (dishes, ingredients, cuisines), animals (species, breeds), plants, locations, structures, people (occupations, roles), organizations, diseases, substances, media, and more. Basically everything you might actually encounter in images.

The BabelNet ID (`bn_id`) in each entry is your gateway to the full knowledge graph. Through that ID, you can pull semantic relationships (is-a, part-of, related-to), get definitions in dozens of languages, and connect to Wikipedia, WordNet, and other structured resources. It's not just "here's a label" - it's "here's where this concept sits in human knowledge."

### Quick Performance Tips

Pick your model based on what you actually need. The base model (0.2B params) is fast enough for real-time stuff, the large model (0.7B) gives you better accuracy for production, and the SO400M model (0.9B) is when you need the absolute best performance and don't care about inference speed.

The text dataset is tiny (few MB), downloads instantly. The image dataset is 4.26 GB, so first download takes a minute. If you're memory-constrained, stream it:

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

For inference: batch your images together, use GPU if you have one (`model.to("cuda")`), and for god's sake cache your processor and model instead of reloading them every time.

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

## Who Should Care About This?

**If you're in research**, Concept-10k gives you a benchmark that actually tests real-world generalization instead of ImageNet memorization. The semantic annotations let you train models that learn structured knowledge, not just pixel-text correlations. And when models fail, you can diagnose exactly which concept types are problematic.

**If you're building production systems**, this is your reality check. Test on Concept-10k before deploying, incorporate the semantic structure if you can, and understand your model's limitations before your users find them for you.

**For the field overall**, we need to shift evaluation beyond ImageNet-centric metrics. We need to integrate vision with knowledge graphs. We need to care about long-tail concepts and real-world diversity. Concept-pedia is one step in that direction.

## The Bottom Line

We spent a decade building models that ace ImageNet and fail in the real world. That 30+ point performance drop on Concept-10k? That's the gap between what we think our models can do and what they actually can do.

Concept-pedia gives you 165K+ semantically-annotated concepts for training, Concept-10k for honest evaluation, and evidence that our current approaches are way more limited than the benchmarks suggested. The semantic structure shows a path forward - combine vision with knowledge graphs instead of just scaling up image-text pairs.

All the code and data is on Hugging Face. The models are ready to use. The benchmark is waiting.

Time to build multimodal AI that actually handles real-world visual diversity, not just ImageNet variations.

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

_Built with ❤️ by Andrei Stefan Bejgu - AI Applied Scientist @ [Syllotips](https://syllotips.com)_
