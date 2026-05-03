# Career Atlas

A Hugo site for publishing flat career posts under `content/posts/`.

## Content model

- one post per career
- one primary `category`
- tags for cross-cutting discovery
- optional salary and company metadata

## GitHub Pages

This repo is configured to deploy to GitHub Pages from GitHub Actions.

Expected production URL:

`https://anandhs.github.io/careers/`

To enable it in GitHub:

1. Open the `careers` repository on GitHub.
2. Go to `Settings -> Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push to `main` or run the `Deploy Hugo site to GitHub Pages` workflow manually.

## Requesting new career articles

This repo also supports a request-driven draft generation workflow.

How it works:

1. Open a GitHub issue using the `Career request` form.
2. GitHub Actions reads the issue details.
3. The workflow loads the site rules from `AGENTS.md`.
4. OpenAI generates a draft post into `content/posts/`.
5. The workflow opens a pull request for review.

Required GitHub secret:

- `OPENAI_API_KEY`

Optional environment override in the workflow:

- `OPENAI_MODEL`
  Default is `gpt-4o-mini`

Recommended behavior:

- keep generated posts as `draft: true`
- review the PR before merging
- merge only after checking accuracy, references, and category/tag choices

## Run locally

```bash
hugo server
```

## Create a new career post

```bash
hugo new posts/my-career.md
```

Then update the front matter and use the standard section structure defined in [AGENTS.md](./AGENTS.md).
