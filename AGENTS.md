# AGENTS.md

You are writing career guide posts for this site.

## Site model

- Store all career posts in `content/posts/`
- Keep the file structure flat
- Use one primary `category` and a flexible `tags` list

## Required front matter

```yaml
---
title: "Career Title"
date: 2026-05-02
description: "Short summary of the career page."
category: "Technology"
categories: ["Technology"]
tags: ["problem-solving", "remote-friendly"]
draft: false
---
```

Keep `categories` in sync with `category`. The singular `category` field is the main authoring field for this site, and the `categories` array exists to power Hugo's taxonomy pages cleanly.

## Optional front matter

```yaml
salary_range: "$85,000-$180,000"
salary_scope: "US national"
salary_as_of: "2026"
featured_companies: ["Company A", "Company B", "Company C"]
```

## Section order for every new career post

1. `## What this job is`
2. `## Day in the life`
3. `## Earning potential`
4. `## How to get there`
5. `## A course plan through high school and college`
6. `## Skills that help`
7. `## Leading companies`
8. `## Risks and tradeoffs`
9. `## Next 10 year outlook`
10. `## What to know before choosing it`
11. `## More details (and references)`

## Writing guidance

- Write for students and early career explorers first.
- Use clear, practical language.
- In the course-plan section, describe a practical progression through high school and college.
- Split the course plan into clear stages such as `Grades 9-10`, `Grades 11-12`, and `College years` when possible.
- Keep the plan realistic and broadly applicable, not overly specialized.
- Keep skills concrete and learnable.
- Do not use personality-type matching.
- Keep the risks section honest and specific.
- Keep the 10-year outlook thoughtful, not overconfident.
- Prefer official or primary references when possible.
- Whenever a new career is added, add the accurate and correct day it was added
