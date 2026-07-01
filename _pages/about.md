---
layout: about
title: about
permalink: /
subtitle: Senior AI Applied Scientist @ <a href="https://www.syllotips.com">SylloTips</a> · Ph.D. in Artificial Intelligence @ <a href="https://nlp.uniroma1.it/">Sapienza University of Rome</a>

# Sitemap settings
priority: 1.0
changefreq: weekly

profile:
  align: right
  image: prof_pic.png
  image_circular: false # crops the image to make it circular
  image_alt: "Andrei Stefan Bejgu, Senior AI Applied Scientist working on agent orchestration, governance and memory"
  more_info: false

selected_papers: true # includes a list of papers marked as "selected={true}"
social: true # includes social icons at the bottom of the page

announcements:
  enabled: true
  scrollable: true
  limit: 5

latest_posts:
  enabled: true
  scrollable: true
  limit: 3
---

<div class="bg-grid" aria-hidden="true"></div>

<div class="hero-intro animated-section" markdown="1">

I build AI agents that hold up in production. At [SylloTips](https://www.syllotips.com) I work on the **runtime that governs how agents plan, act, and stay grounded**: orchestration, guardrails, memory and tooling, so an agent reasons over a real company instead of hallucinating its way through it.

Before this, a **Ph.D. in AI** at Sapienza's [NLP group](https://nlp.uniroma1.it/), on how machines pin down what words actually *mean* in context. That work landed at ACL 2024 and EMNLP 2025.

</div>

<div class="cred-row animated-section">
  <div class="cred"><span class="cred-num">Ph.D.</span><span class="cred-label">AI · Sapienza</span></div>
  <div class="cred"><span class="cred-num">ACL '24</span><span class="cred-label">Word Sense Linking</span></div>
  <div class="cred"><span class="cred-num">EMNLP '25</span><span class="cred-label">ConceptPedia</span></div>
  <div class="cred"><span class="cred-num">Beanis</span><span class="cred-label">open source · PyPI</span></div>
</div>

<div class="section-card animated-section" markdown="1">

<p class="eyebrow">Currently</p>

## What I'm building now

Most "AI agents" demo well and fall apart the moment a real workflow touches them. My job is the unglamorous middle: making an agent's reasoning trustworthy, repeatable, and supervisable.

<div class="now-grid">
  <div class="now-card">
    <div class="now-kicker">orchestration</div>
    <h3>Agent orchestration &amp; governance</h3>
    <p>Planner / replanner loops, failure handling, and grounding guards. Confidence and citation grading so an agent cites what it knows and refuses what it doesn't, instead of fabricating an answer.</p>
  </div>
  <div class="now-card">
    <div class="now-kicker">memory</div>
    <h3>Agentic context engineering &amp; memory</h3>
    <p>Shaping behaviour through evolving context and durable memory. What an agent carries between turns is what makes it reliable.</p>
  </div>
  <div class="now-card">
    <div class="now-kicker">protocol</div>
    <h3>MCP &amp; tool execution</h3>
    <p>Building Model Context Protocol servers and a sandboxed code-interpreter agent, so agents can run code and call real tools safely, with the human still in the loop.</p>
  </div>
  <div class="now-card">
    <div class="now-kicker">human-in-loop</div>
    <h3>Continuous improvement</h3>
    <p>Subject-matter experts correct an agent once; those corrections become durable, governed knowledge the whole system learns from. No retraining cycle required.</p>
  </div>
</div>

<div class="tags-container">
  <span class="tag">Agent Orchestration</span>
  <span class="tag">Agent Governance</span>
  <span class="tag">Agentic Context Engineering</span>
  <span class="tag">Model Context Protocol</span>
  <span class="tag">Agent Memory</span>
  <span class="tag">Grounded RAG</span>
  <span class="tag">Multilingual NLP</span>
</div>

</div>

<div class="section-card animated-section" markdown="1">

<p class="eyebrow">Background</p>

## Research &amp; open source

<div class="project-highlight" markdown="1">

**Word Sense Linking** · ACL 2024

Disambiguating word meaning on real, messy text, not just curated benchmarks. The hard part isn't the dictionary; it's deciding *which* sense a sentence actually triggers.

</div>

<div class="project-highlight" markdown="1">

**ConceptPedia** · EMNLP 2025

A large-scale resource connecting concepts across languages, built to give models a shared semantic backbone instead of a per-language patchwork.

</div>

<div class="project-highlight" markdown="1">

**[Beanis](https://pypi.org/project/beanis/)** · Redis ODM for Python

A Pydantic-style typed ODM for Redis: ~70% less boilerplate, performance within 8% of raw Redis. For people who want type safety without giving up speed.

</div>

</div>

<div class="callout-box animated-section" markdown="1">

I like the seam between research and production: taking something that works in a paper and making it survive contact with messy data and tight latency budgets. When I'm not on that, I'm writing it up or shipping it as open source.

</div>

<script>
  // Progressive scroll-reveal: only hide content once JS confirms it can reveal it.
  (function () {
    var sections = document.querySelectorAll(".animated-section");
    if (!sections.length) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;

    document.documentElement.classList.add("has-reveal");
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            var el = entry.target;
            // small stagger based on visual order
            setTimeout(function () { el.classList.add("in-view"); }, Math.min(i * 70, 210));
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    sections.forEach(function (s) { io.observe(s); });
  })();
</script>
