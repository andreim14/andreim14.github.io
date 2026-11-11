---
layout: page
eyebrow: open source
permalink: /repositories/
title: code
description: "Code I maintain in the open: a typed Redis ODM, and the research systems behind my papers."
nav: true
nav_order: 4
---

## What I maintain

A typed Redis ODM I built for my own work, plus the systems behind the papers: factuality evaluation, word-sense linking, and cross-lingual alignment.

{% if site.data.repositories.github_repos %}

<style>
  /* Self-contained: the purged site CSS has no grid or card utilities. */
  .repo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr)); gap: 1rem; margin: 1rem 0; }
  article .repo-grid a.repo-card { display: flex; flex-direction: column; gap: 0.4rem; padding: 1rem 1.1rem !important; border: 1px solid var(--global-divider-color);
    border-radius: 8px; background: var(--global-card-bg-color); color: var(--global-text-color); text-decoration: none; border-bottom-width: 1px; }
  article .repo-grid a.repo-card:hover { border-color: var(--global-theme-color); text-decoration: none; }
  .repo-card-name { font-weight: 600; color: var(--global-theme-color); }
  .repo-card-desc { font-size: 0.9rem; line-height: 1.45; }
  .repo-card-meta { font-size: 0.8rem; color: var(--global-text-color-light); margin-top: auto; }
</style>

<div class="repo-grid">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
{% endif %}
