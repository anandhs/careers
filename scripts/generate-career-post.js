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
const siteBaseUrl = process.env.SITE_BASE_URL || "";

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
    "## A course plan through high school and college",
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

function ensureReferences(markdown) {
  const referencesSection = markdown.split("## More details (and references)")[1] || "";
  const urlMatches = referencesSection.match(/https?:\/\/[^\s)]+/g) || [];
  if (urlMatches.length < 2) {
    fail("Generated post must include at least 2 reference URLs.");
  }
}

function extractTextFromResponse(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  if (!Array.isArray(data.output)) {
    return "";
  }

  const chunks = [];

  for (const item of data.output) {
    if (!Array.isArray(item.content)) continue;

    for (const contentItem of item.content) {
      if (contentItem.type === "output_text" && typeof contentItem.text === "string") {
        chunks.push(contentItem.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function stripCodeFence(text) {
  return text
    .replace(/^```(?:json|markdown|md)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function parseJsonPayload(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`Generated output was not valid JSON. Raw output: ${text}`);
  }
}

function validateGeneratedPayload(payload) {
  const requiredStringFields = [
    "title",
    "description",
    "category",
    "what_this_job_is",
    "day_in_the_life",
    "earning_potential",
    "how_to_get_there",
    "course_plan_through_high_school_and_college",
    "skills_that_help",
    "leading_companies",
    "risks_and_tradeoffs",
    "next_10_year_outlook",
    "what_to_know_before_choosing_it",
    "more_details_and_references",
  ];

  for (const field of requiredStringFields) {
    if (typeof payload[field] !== "string" || !payload[field].trim()) {
      fail(`Generated JSON is missing required field: ${field}`);
    }
  }

  if (!Array.isArray(payload.tags) || payload.tags.length === 0) {
    fail("Generated JSON must include a non-empty tags array.");
  }

  const optionalArrayFields = ["featured_companies"];
  for (const field of optionalArrayFields) {
    if (payload[field] !== undefined && !Array.isArray(payload[field])) {
      fail(`Generated JSON field must be an array when present: ${field}`);
    }
  }
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function yamlArray(values) {
  return `[${values.map((value) => JSON.stringify(String(value))).join(", ")}]`;
}

function composeMarkdown(payload) {
  const frontMatter = [
    "---",
    `title: ${yamlString(payload.title)}`,
    "date: 2026-05-03",
    `description: ${yamlString(payload.description)}`,
    `category: ${yamlString(payload.category)}`,
    `categories: ${yamlArray([payload.category])}`,
    `tags: ${yamlArray(payload.tags)}`,
    "draft: false",
    `salary_range: ${yamlString(payload.salary_range || "")}`,
    `salary_scope: ${yamlString(payload.salary_scope || "")}`,
    `salary_as_of: ${yamlString(payload.salary_as_of || "")}`,
    `featured_companies: ${yamlArray(payload.featured_companies || [])}`,
    "---",
    "",
  ].join("\n");

  const body = [
    "## What this job is",
    "",
    payload.what_this_job_is.trim(),
    "",
    "## Day in the life",
    "",
    payload.day_in_the_life.trim(),
    "",
    "## Earning potential",
    "",
    payload.earning_potential.trim(),
    "",
    "## How to get there",
    "",
    payload.how_to_get_there.trim(),
    "",
    "## A course plan through high school and college",
    "",
    payload.course_plan_through_high_school_and_college.trim(),
    "",
    "## Skills that help",
    "",
    payload.skills_that_help.trim(),
    "",
    "## Leading companies",
    "",
    payload.leading_companies.trim(),
    "",
    "## Risks and tradeoffs",
    "",
    payload.risks_and_tradeoffs.trim(),
    "",
    "## Next 10 year outlook",
    "",
    payload.next_10_year_outlook.trim(),
    "",
    "## What to know before choosing it",
    "",
    payload.what_to_know_before_choosing_it.trim(),
    "",
    "## More details (and references)",
    "",
    payload.more_details_and_references.trim(),
    "",
  ].join("\n");

  return `${frontMatter}${body}`;
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

function buildPostUrl() {
  if (!siteBaseUrl) return "";

  const postSlug = path.parse(fileName).name;

  try {
    return new URL(`posts/${postSlug}/`, siteBaseUrl).toString();
  } catch (error) {
    return "";
  }
}

const prompt = `
You are generating structured data for a Hugo career article in a GitHub repository.

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
- Return only valid JSON.
- Do not wrap the JSON in markdown code fences.
- Use today's date context: 2026-05-03.
- Write for students and early career explorers.
- Include 2 to 3 relevant references with direct URLs.
- Prefer official or primary references where possible.
- Use the salary geography provided above when framing pay.
- Keep tags practical and short.
- Keep the primary category aligned with the request unless the request is clearly wrong.
- In the course-plan section, outline a practical path through high school and college, including relevant examples of courses at each stage when appropriate.
- Split that section into clear stages such as "Grades 9-10", "Grades 11-12", and "College years" when possible.

Return this exact JSON shape:
{
  "title": "Career title",
  "description": "Short summary for the article",
  "category": "Primary category",
  "tags": ["tag-one", "tag-two"],
  "salary_range": "string or empty string",
  "salary_scope": "string or empty string",
  "salary_as_of": "string or empty string",
  "featured_companies": ["Company A", "Company B", "Company C"],
  "what_this_job_is": "Markdown-safe prose",
  "day_in_the_life": "Markdown-safe prose",
  "earning_potential": "Markdown-safe prose",
  "how_to_get_there": "Markdown-safe prose",
  "course_plan_through_high_school_and_college": "Markdown-safe prose",
  "skills_that_help": "Markdown-safe prose",
  "leading_companies": "Markdown-safe prose",
  "risks_and_tradeoffs": "Markdown-safe prose",
  "next_10_year_outlook": "Markdown-safe prose",
  "what_to_know_before_choosing_it": "Markdown-safe prose",
  "more_details_and_references": "Markdown-safe prose with 2 to 3 direct URLs"
}
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
  const text = extractTextFromResponse(data);

  if (!text) {
    fail(`OpenAI API returned no text output. Raw response: ${JSON.stringify(data)}`);
  }

  const payload = parseJsonPayload(stripCodeFence(text));
  validateGeneratedPayload(payload);

  const markdown = composeMarkdown(payload);
  ensureRequiredSections(markdown);
  ensureReferences(markdown);

  fs.writeFileSync(filePath, markdown, "utf8");

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `post_path=content/posts/${fileName}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `post_title=${careerTitle}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `post_url=${buildPostUrl()}\n`);
  }

  console.log(`Generated ${filePath}`);
}

generate().catch((error) => {
  fail(error.stack || error.message);
});
