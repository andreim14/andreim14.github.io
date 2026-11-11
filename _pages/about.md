---
layout: default
title: about
permalink: /
description: "Andrei Stefan Bejgu, Senior AI Applied Scientist at Syllotips. I build AI agents that stay grounded in production: planning, tool use, citations and evaluation. Ph.D. in AI from Sapienza, 9+ years across NLP research and engineering."
sitemap:
  priority: 1.0
  changefreq: weekly
---

{%- assign repos = site.data.repositories -%}

<section class="hero" aria-labelledby="hero-name">
  <div class="hero-main">
    <p class="eyebrow">Senior AI Applied Scientist · <a href="https://www.syllotips.com">Syllotips</a> · Rome</p>
    <h1 id="hero-name" class="hero-name"><span>Andrei Stefan</span> <span>Bejgu</span></h1>

    <div class="answer" data-answer>
      <p class="prompt"><span class="caret">&gt;</span> who is andrei?</p>
      <p class="answer-text">
        <span class="claim">I build AI agents that stay <button type="button" class="sense" data-sense="grounded|adj. · sense 3 of 7|Supported by evidence, not by confidence. The other six senses involve electricity, aircraft and teenagers.">grounded</button> in production</span><a class="cite" href="#src-1" data-cite="1">1</a>.
        <span class="claim">Before that I spent eight years at Babelscape, growing from software engineer to NLP researcher</span><a class="cite" href="#src-2" data-cite="2">2</a>,
        <span class="claim">earned a Ph.D. in AI at Sapienza</span><a class="cite" href="#src-3" data-cite="3">3</a>,
        and <span class="claim">co-first-authored LLM-Oasis, a benchmark for telling true answers from fluent ones</span><a class="cite" href="#src-4" data-cite="4">4</a>.
      </p>
      <p class="verdict" aria-live="polite"><span class="dot"></span><span data-verdict>4 of 4 claims supported</span></p>
    </div>

    <div class="cta">
      <a class="btn" href="{{ '/assets/pdf/cv.pdf' | relative_url }}">Read the CV</a>
      <a class="btn ghost" href="mailto:stefan.bejgu@gmail.com" data-copy="stefan.bejgu@gmail.com">stefan.bejgu@gmail.com</a>
    </div>
  </div>

  <aside class="hero-side" aria-label="Sources">
    <figure class="portrait">
      <img src="{{ '/assets/img/prof_pic.png' | relative_url }}" alt="Andrei Stefan Bejgu" width="360" height="480" fetchpriority="high">
    </figure>
    <ol class="sources">
      <li id="src-1" data-src="1"><a href="#work"><span class="n">1</span><span><b>Syllotips</b> Senior AI Applied Scientist, 2025 to now</span></a></li>
      <li id="src-2" data-src="2"><a href="#trace"><span class="n">2</span><span><b>Babelscape</b> Software engineer to NLP researcher, 2017 to 2025</span></a></li>
      <li id="src-3" data-src="3"><a href="#trace"><span class="n">3</span><span><b>Sapienza</b> Ph.D. in AI with Roberto Navigli, 2025</span></a></li>
      <li id="src-4" data-src="4"><a href="https://direct.mit.edu/coli/article/52/1/1/133509/Truth-or-Mirage-Towards-End-To-End-Factuality"><span class="n">4</span><span><b>Computational Linguistics</b> Truth or Mirage? LLM-Oasis, 2026</span></a></li>
    </ol>
  </aside>
  <svg class="ground-lines" aria-hidden="true"></svg>
</section>

<section id="work" class="block" aria-labelledby="work-h">
  <header class="block-head reveal">
    <p class="eyebrow"><span class="idx">01</span> now</p>
    <h2 id="work-h">What I build at Syllotips</h2>
    <p class="lede">Syllotips lets enterprise AI agents learn from a company's own experts. I work on the engine underneath: how agents plan, which tools they call, how they cite their sources, and how we find where they fail. Most of it is the <button type="button" class="sense" data-sense="harness|n. · sense 2|The code around a model that decides what it may do, how much of it, and when to stop.">harness</button>, not the model.</p>
  </header>

  <div class="work-grid">
    <article class="work-card feature reveal">
      <div class="wc-text">
        <p class="wc-n">deep research</p>
        <h3>Rebuilt the deep-research agent</h3>
        <p>The main product, redesigned around tool calling, shared working memory and a harness with tool budgets and bounded replanning.</p>
        <p class="metric"><span class="metric-num" data-count-from="78" data-count-to="92">92</span><span class="metric-pct">%</span><span class="metric-label">judged answer quality,<br>up from 78%</span></p>
      </div>
      <div class="run" aria-label="Example agent run">
        <p class="run-head"><span>agent run</span><span class="run-state">live</span></p>
        <ol class="run-log" data-run>
          <li><b>plan</b> 3 steps, budget 12 tool calls</li>
          <li><b>search</b> knowledge base · 14 snippets</li>
          <li><b>mcp</b> jira.search_issues · 32 results</li>
          <li><b>run_code</b> join tickets with sales sheet</li>
          <li><b>check</b> every figure has a source</li>
          <li class="ok"><b>answer</b> 5 claims, 5 citations</li>
        </ol>
      </div>
    </article>

    <article class="work-card reveal">
      <p class="wc-n">tools</p>
      <h3>MCP layer</h3>
      <p>Connects the agents to enterprise tools such as Atlassian, HubSpot and Intercom: one architecture for cloud and private cloud, OAuth handling, and tool results the agents can cite.</p>
    </article>
    <article class="work-card reveal">
      <p class="wc-n">compute</p>
      <h3>Code interpreter</h3>
      <p>A sandbox where agents analyse spreadsheets and produce reports and files, on cloud and private cloud alike.</p>
    </article>
    <article class="work-card reveal">
      <p class="wc-n">experts</p>
      <h3>Assistant agent</h3>
      <p>Helps experts close the loop on issues: it investigates what went wrong and proposes a solution for them to review.</p>
    </article>
    <article class="work-card reveal">
      <p class="wc-n">serving</p>
      <h3>Self-hosted models</h3>
      <p>vLLM on multi-GPU clusters: open-weight LLMs with up to 1M-token context, plus small decision models for fast routing and grading. The agents can run fully on our own infrastructure.</p>
    </article>
    <article class="work-card reveal">
      <p class="wc-n">fine-tuning</p>
      <h3>Small models, on a supercomputer</h3>
      <p>Fine-tuned open-weight LLMs from 0.6B to 32B so that one small model replaces three commercial LLM calls for answer confidence estimation.</p>
    </article>
  </div>
</section>

<section id="trace" class="block" aria-labelledby="trace-h">
  <header class="block-head reveal">
    <p class="eyebrow"><span class="idx">02</span> career</p>
    <h2 id="trace-h">Nine years, as an agent <button type="button" class="sense" data-sense="trace|n. · sense 4|The step-by-step log an agent leaves behind, so you can see what it did and why. Also: a career.">trace</button></h2>
    <p class="lede">Every step below happened. Most of them are in production somewhere.</p>
  </header>

  <ol class="trace" data-trace>
    <li class="step reveal">
      <time>Oct 2025 · now</time>
      <div><p class="step-who"><a href="https://www.syllotips.com">Syllotips</a> · Senior AI Applied Scientist <span class="running">running</span></p>
      <p>Agents for customer, sales and field support that improve as experts correct them. See <a href="#work">above</a>.</p></div>
    </li>
    <li class="step reveal">
      <time>Jan 2025</time>
      <div><p class="step-who">Sapienza · Ph.D. in Artificial Intelligence</p>
      <p>Lexical semantics for multilingual NLP, and word and sentence representations for RAG and LLMs. Joint industrial Ph.D. with Babelscape, advised by Roberto Navigli.</p></div>
    </li>
    <li class="step reveal">
      <time>2021 · 2025</time>
      <div><p class="step-who"><a href="https://babelscape.com">Babelscape</a> · NLP Researcher</p>
      <p>Led <b>Vera</b>, a multilingual fact-checking product on LLMs and RAG: real-time retrieval over web and proprietary data, claim extraction and verification. Fine-tuned open LLMs on Slurm clusters for text-to-SQL and claim verification. Worked on <b>Minerva</b>, the first Italian LLM. Mentored interns from prototype to deployment.</p></div>
    </li>
    <li class="step reveal">
      <time>Nov 2021</time>
      <div><p class="step-who">Sapienza · MSc in Computer Science, 110/110 with honors</p>
      <p>Thesis on language-agnostic latent spaces for sentences. Same year: Best Employee Award at Babelscape.</p></div>
    </li>
    <li class="step reveal">
      <time>2020 · 2021</time>
      <div><p class="step-who">Babelscape · NLP Engineer</p>
      <p>Built <b>Semantic Paths</b>, multilingual semantic search for scientific papers, and Word Sense Disambiguation models for large-scale multilingual text.</p></div>
    </li>
    <li class="step reveal">
      <time>2017 · 2020</time>
      <div><p class="step-who">Babelscape · Software Engineer</p>
      <p>Built <b>myKnowledgeGraph</b> for knowledge graph extraction, the company's Java NLP pipeline, and concept extraction for trademark names. BSc in Computer Science at Sapienza along the way.</p></div>
    </li>
    <li class="step reveal">
      <time>Dec 2016</time>
      <div><p class="step-who">CINI · Software Developer</p>
      <p>First job: a tool for lexicon-semantic stylometric analysis of large text collections.</p></div>
    </li>
  </ol>
</section>

<section id="research" class="block" aria-labelledby="research-h">
  <header class="block-head reveal">
    <p class="eyebrow"><span class="idx">03</span> research</p>
    <h2 id="research-h">Do models mean what they say?</h2>
    <p class="lede">Factuality, word senses, and multilingual and multimodal meaning. Published at ACL, EMNLP, NAACL, EACL and in Computational Linguistics. Reviewer for ACL, EMNLP, EACL and ICLR.</p>
  </header>

  <ol class="papers">
    <li class="paper reveal">
      <p class="venue">Computational Linguistics · 2026 · co-first author</p>
      <h3><a href="https://direct.mit.edu/coli/article/52/1/1/133509/Truth-or-Mirage-Towards-End-To-End-Factuality">Truth or Mirage? LLM-Oasis</a></h3>
      <p>A large-scale resource for end-to-end factuality evaluation, built by extracting and falsifying facts from Wikipedia.</p>
      <p class="links"><a href="https://github.com/Babelscape/LLM-Oasis">code</a><a href="https://arxiv.org/abs/2411.19655">arXiv</a></p>
    </li>
    <li class="paper reveal">
      <p class="venue">ACL · 2024 · first author</p>
      <h3><a href="{{ '/blog/2025/word-sense-linking-acl-2024/' | relative_url }}">Word Sense Linking</a></h3>
      <p>Finds the ambiguous words in raw text and links each one to its sense, with no pre-marked spans or candidate lists.</p>
      <p class="links"><a href="https://github.com/Babelscape/WSL">code</a><a href="https://huggingface.co/Babelscape/wsl-base">model</a></p>
    </li>
    <li class="paper reveal">
      <p class="venue">EMNLP · 2025</p>
      <h3><a href="{{ '/blog/2025/concept-pedia-emnlp-2025/' | relative_url }}">Concept-pedia</a></h3>
      <p>A wide-coverage, semantically annotated multimodal dataset of 165K+ visual concepts built on BabelNet, with the Concept-10k benchmark for vision-language models.</p>
      <p class="links"><a href="https://aclanthology.org/2025.emnlp-main.1745.pdf">pdf</a><a href="https://huggingface.co/datasets/sapienzanlp/Concept-10k">dataset</a></p>
    </li>
    <li class="paper reveal">
      <p class="venue">Findings of NAACL · 2025</p>
      <h3><a href="https://aclanthology.org/2025.findings-naacl.371/">Vocabulary adaptation for Italian LLMs</a></h3>
      <p>Part of the Minerva work: adapting the vocabulary cuts token fertility, so the same model reads more Italian per token.</p>
    </li>
  </ol>
  <p class="more reveal"><a href="{{ '/publications/' | relative_url }}">All papers →</a></p>
</section>

<section id="code" class="block" aria-labelledby="code-h">
  <header class="block-head reveal">
    <p class="eyebrow"><span class="idx">04</span> open source</p>
    <h2 id="code-h">Code you can run</h2>
  </header>
  <div class="repos">
    {%- for r in repos.github_repos -%}
    {%- assign info = repos.repo_details[r] -%}
    <a class="repo reveal" href="https://github.com/{{ r }}">
      <span class="repo-name">{{ r | split: '/' | last }}</span>
      <span class="repo-owner">{{ r | split: '/' | first }}</span>
      <span class="repo-desc">{{ info.description }}</span>
      <span class="repo-meta">{{ info.language }} · ★ {{ info.stars }}</span>
    </a>
    {%- endfor -%}
  </div>
</section>

<section id="writing" class="block" aria-labelledby="writing-h">
  <header class="block-head reveal">
    <p class="eyebrow"><span class="idx">05</span> writing</p>
    <h2 id="writing-h">Long-form, with code</h2>
  </header>
  {% assign latest = site.posts | slice: 0, 4 %}
  <div class="reveal">{% include post-list.liquid posts=latest %}</div>
  <p class="more reveal"><a href="{{ '/blog/' | relative_url }}">All writing →</a></p>
</section>
