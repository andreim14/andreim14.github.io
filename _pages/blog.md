---
layout: page
title: writing
permalink: /blog/
eyebrow: blog
description: Notes on agents, retrieval and the Python tools I build along the way. Mostly long-form, always with code.
---

{% assign blog_posts = site.posts | where_exp: "post", "post.date <= site.time" %}
{% include post-list.liquid posts=blog_posts %}
