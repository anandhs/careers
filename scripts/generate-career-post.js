const fs = require("fs");
const path = require("path");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const repoRoot = process.cwd();
const eventPath = process.env.GITHUB_EVENT_PATH;
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!eventPath) fail("GITHUB_EVENT_PATH is required.");
if (!apiKey) fail("OPENAI_API_KEY is required.");

const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const issue = event.issue;

if (!issue) fail("This workflow requires a GitHub issue event.");

const issueBody = issue.body || "";
const agentsPath = path.join(repoRoot, "AGENTS.md");
const agentsMd = fs.readFileSync(agentsPath, "utf8");

function getField(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`### ${escaped}\\s*\\n([\\s\\S]*?)(?=\\n### |$)`, "i");
  const match = body.match(regex);
  return match ? match[1].trim() : "";
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function ensureRequiredSections(markdown) {
  const headings = [
    "## What this job is",
    "## Day in the life",
    "## Earning potential",
    "## How to get there",
    "## Skills that help",
    "## Leading companies",
    "## Risks and tradeoffs",
    "## Next 10 year outlook",
    "## What to know before choosing it",
    "## More details (and references)",
  ];

  for (const heading of headings) {
    if (!markdown.includes(heading)) {
      fail(`Generated post is missing required section: ${heading}`);
    }
  }
}

function ensureFrontMatter(markdown) {
  if (!markdown.startsWith("---\n")) {
    fail("Generated post is missing front matter.");
  }

  const end = markdown.indexOf("\n---\n", 4);
  if (end === -1) {
    fail("Generated post front matter is not closed.");
  }

  const frontMatter = markdown.slice(4, end);
  const requiredFields = [
    "title:",
    "date:",
    "description:",
    "category:",
    "categories:",
    "tags:",
    "draft:",
  ];

  for (const field of requiredFields) {
    if (!frontMatter.includes(field)) {
      fail(`Generated front matter is missing field: ${field}`);
    }
  }

  if (!/draft:\s*true/i.test(frontMatter)) {
    fail("Generated post must be created with draft: true.");
  }

  const categoryMatch = frontMatter.match(/^category:\s*"?(.*?)"?$/m);
  const categoriesMatch = frontMatter.match(/^categories:\s*\[(.*?)\]$/m);
  if (categoryMatch && categoriesMatch) {
    const category = categoryMatch[1].trim();
    const categoriesRaw = categoriesMatch[1].trim();
    if (!categoriesRaw.includes(category)) {
      fail("Generated front matter must keep category and categories in sync.");
    }
  }
}

function ensureReferences(markdown) {
  const referencesSection = markdown.split("## More details (and references)")[1] || "";
  const urlMatches = referencesSection.match(/https?:\/\/[^\s)]+/g) || [];
  if (urlMatches.length < 2) {
    fail("Generated post must include at least 2 reference URLs.");
  }
}

function stripCodeFence(text) {
  return text
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim() + "\n";
}

const careerTitle = getField(issueBody, "Career title") || issue.title.replace(/^\[Career Request\]\s*/i, "").trim();
const category = getField(issueBody, "Primary category");
const geography = getField(issueBody, "Geography for salary context");
const tags = getField(issueBody, "Suggested tags");
const notes = getField(issueBody, "Extra notes");

if (!careerTitle) fail("Could not determine career title from issue.");
if (!category) fail("Could not determine category from issue.");
if (!geography) fail("Could not determine geography from issue.");

const slug = slugify(careerTitle);
const contentDir = path.join(repoRoot, "content", "posts");
let fileName = `${slug}.md`;
let filePath = path.join(contentDir, fileName);

if (fs.existsSync(filePath)) {
  fileName = `${slug}-request-${issue.number}.md`;
  filePath = path.join(contentDir, fileName);
}

const prompt = `
You are generating a Hugo career article for a GitHub repository.

Follow the repository rules below exactly.

REPOSITORY WRITING RULES:
${agentsMd}

CAREER REQUEST:
- Career title: ${careerTitle}
- Primary category: ${category}
- Geography for salary context: ${geography}
- Suggested tags: ${tags || "None provided"}
- Extra notes: ${notes || "None provided"}

OUTPUT RULES:
- Return only the final Markdown file content.
- Include valid Hugo front matter at the top.
- Set draft: true.
- Keep category and categories in sync.
- Use today's date: 2026-05-03.
- Use the exact section order required by AGENTS.md.
- Write for students and early career explorers.
- Include 2 to 3 relevant references with direct URLs.
- Prefer official or primary references where possible.
- Use the salary geography provided above when framing pay.
- Do not include any explanation before or after the Markdown.
`.trim();

async function generate() {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    fail(`OpenAI API request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data.output_text;

  if (!text) {
    fail("OpenAI API returned no output_text.");
  }

  const markdown = stripCodeFence(text);
  ensureFrontMatter(markdown);
  ensureRequiredSections(markdown);
  ensureReferences(markdown);

  fs.writeFileSync(filePath, markdown, "utf8");

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `post_path=content/posts/${fileName}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `post_title=${careerTitle}\n`);
  }

  console.log(`Generated ${filePath}`);
}

generate().catch((error) => {
  fail(error.stack || error.message);
});
