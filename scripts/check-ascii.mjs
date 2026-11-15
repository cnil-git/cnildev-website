// Fails if any tracked text file contains bytes outside printable ASCII,
// tab, and newline. Run with: pnpm check:ascii
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf)$/i.test(f) && f !== "pnpm-lock.yaml");

let bad = 0;
for (const file of files) {
  const lines = readFileSync(file).toString("latin1").split("\n");
  lines.forEach((line, i) => {
    if (/[^\t\x20-\x7e]/.test(line)) {
      console.error(`${file}:${i + 1}: non-ASCII byte`);
      bad++;
    }
  });
}
if (bad) process.exit(1);
console.log(`ascii ok (${files.length} files)`);
