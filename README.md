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

## Run locally

```bash
hugo server
```

## Create a new career post

```bash
hugo new posts/my-career.md
```

Then update the front matter and use the standard section structure defined in [AGENTS.md](./AGENTS.md).
