/**
 * Run classifier against a test JSON file and report accuracy.
 * Usage: node scripts/test_classifier.js [test_file.json]
 * Default: test_posts_500.json
 */

const fs = require("fs");
const path = require("path");
const { classifyFromText } = require("./classifier.js");

// Map test file category labels -> internal classifier output
const EXPECTED_TO_INTERNAL = {
  "Job Seeking": "job_seeking",
  "Hiring Posts": "hiring",
  "Job Announcements": "hired_announcement",
  "Project Launch": "project_launch",
  "Sales Pitch": "sales_pitch",
  "Hustle Culture": "grindset",
  "Certifications": "congrats",
  "Sponsored/Ads": "sponsored",
  "Educational/Tips": "educational",
  "Events/Webinars": "events",
  "Uncategorized": "other",
  "Other/None": "other",
};

const testFile = process.argv.find((a) => a.endsWith(".json")) || "test_posts_500.json";
const testPath = path.isAbsolute(testFile) ? testFile : path.join(__dirname, "..", testFile);
const raw = fs.readFileSync(testPath, "utf8");
const posts = JSON.parse(raw);

let correct = 0;
const total = posts.length;
const byCategory = {};
const failures = [];

for (const { text, category: expectedLabel } of posts) {
  const expected = EXPECTED_TO_INTERNAL[expectedLabel];
  if (expected === undefined) {
    console.warn("Unknown expected category:", expectedLabel);
    continue;
  }
  const predicted = classifyFromText(text);
  const ok = predicted === expected;
  if (ok) correct++;
  else failures.push({ text: text.slice(0, 120), expected: expectedLabel, predicted });

  if (!byCategory[expectedLabel]) {
    byCategory[expectedLabel] = { total: 0, correct: 0 };
  }
  byCategory[expectedLabel].total++;
  if (ok) byCategory[expectedLabel].correct++;
}

const pct = ((100 * correct) / total).toFixed(2);
console.log("\n=== Classifier accuracy (" + path.basename(testPath) + ") ===\n");
console.log(`Overall: ${correct}/${total} = ${pct}%\n`);
console.log("Per category:");
for (const [label, { total: n, correct: c }] of Object.entries(byCategory).sort((a, b) => a[0].localeCompare(b[0]))) {
  const p = n ? ((100 * c) / n).toFixed(1) : "0";
  console.log(`  ${label}: ${c}/${n} (${p}%)`);
}

if (failures.length > 0 && process.argv.includes("--show-failures")) {
  console.log("\n--- Sample failures (first 30) ---\n");
  failures.slice(0, 30).forEach((f, i) => {
    console.log(`${i + 1}. expected="${f.expected}" got="${f.predicted}"`);
    console.log(`   "${f.text}..."`);
  });
}

// Exit with code 1 if below 95% so CI/loop can check
process.exit(pct >= 95 ? 0 : 1);
