import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

const forbiddenFiles = [".vscode/tasks.json", ".vscode/launch.json"];
for (const file of forbiddenFiles) {
  if (existsSync(resolve(root, file))) {
    failures.push(`${file} is not permitted in this repository.`);
  }
}

const fontDirectory = resolve(root, "public/fonts");
if (existsSync(fontDirectory)) {
  for (const entry of readdirSync(fontDirectory)) {
    if (entry.toLowerCase().endsWith(".eot")) {
      failures.push(`public/fonts/${entry} is not an allowed font format.`);
    }
  }
}

const suspiciousPatterns = [
  /\beval\s*\(/i,
  /\bchild_process\b/i,
  /\bspawn\s*\(/i,
  /\bexec(?:Sync)?\s*\(/i,
  /\bglobal\s*\[[^\]]+\]\s*=/i,
  /\bETH_RPC_URL\b/i,
];

for (const file of ["postcss.config.mjs", "eslint.config.mjs"]) {
  const fullPath = resolve(root, file);
  if (!existsSync(fullPath)) continue;

  const content = readFileSync(fullPath, "utf8");
  if (statSync(fullPath).size > 20_000) {
    failures.push(`${file} is unexpectedly large and requires review.`);
  }
  if (suspiciousPatterns.some((pattern) => pattern.test(content))) {
    failures.push(`${file} contains prohibited executable or obfuscated content.`);
  }
}

if (failures.length) {
  console.error("Security check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Security check passed.");
