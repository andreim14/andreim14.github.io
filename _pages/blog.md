---
layout: page
title: blog
permalink: /blog/
description: Thoughts on AI, NLP, and building practical ML systems
nav: true
nav_order: 1
---

<!-- _pages/blog.md -->

<div class="post">

{% assign blog_posts = site.posts | where_exp: "post", "post.date <= site.time" %}

{% if blog_posts.size > 0 %}
  {% for post in blog_posts %}
    <div class="post-preview mb-4">
      <h2 class="post-title">
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      </h2>
      <p class="post-meta">
        {{ post.date | date: "%B %d, %Y" }}
        {% if post.description %}
          • {{ post.description }}
        {% endif %}
      </p>
      {% if post.tags %}
        <div class="post-tags">
          {% for tag in post.tags %}
            <span class="badge badge-primary">{{ tag }}</span>
          {% endfor %}
        </div>
      {% endif %}
    </div>
    <hr>
  {% endfor %}
{% else %}
  <p>No posts yet.</p>
{% endif %}

</div>
