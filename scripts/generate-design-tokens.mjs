import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const tokens = JSON.parse(await readFile(new URL("design-system/tokens.json", root), "utf8"));
const kebab = (key) => key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
const lines = [];
for (const [key, value] of Object.entries(tokens.color))
  lines.push(`  --color-${kebab(key)}: ${value};`);
for (const [key, value] of Object.entries(tokens.layout))
  lines.push(`  --layout-${kebab(key)}: ${value}px;`);
for (const [key, value] of Object.entries(tokens.control))
  lines.push(`  --control-${kebab(key)}: ${value}px;`);
for (const [key, value] of Object.entries(tokens.radius))
  lines.push(`  --radius-${kebab(key)}: ${value}px;`);
for (const value of tokens.spacing) lines.push(`  --space-${value}: ${value}px;`);
for (const [key, value] of Object.entries(tokens.font)) {
  if (typeof value !== "object") continue;
  lines.push(`  --text-${kebab(key)}: ${value.size / 16}rem;`);
  lines.push(`  --leading-${kebab(key)}: ${value.lineHeight / value.size};`);
}
for (const [key, value] of Object.entries(tokens.motionMs))
  lines.push(`  --motion-${kebab(key)}: ${value}ms;`);

for (const [key, value] of Object.entries(tokens.shadow))
  lines.push(`  --shadow-${kebab(key)}: ${value};`);

const outputs = {
  "app/design-tokens.css": `/* Generated from design-system/tokens.json. Run npm run design:tokens. */\n:root {\n${lines.join("\n")}\n}\n`,
  "lib/design-tokens.ts": `// Generated from design-system/tokens.json. Run npm run design:tokens.\nexport const DESIGN_TOKENS = ${JSON.stringify(tokens, null, 2)} as const;\n`,
};
// Format generated artifacts using the project's existing formatter.
const { format } = await import("prettier");
const config = JSON.parse(await readFile(new URL(".prettierrc.json", root), "utf8"));
for (const [file, content] of Object.entries(outputs)) {
  const target = new URL(file, root);
  const formatted = await format(content, {
    ...config,
    parser: file.endsWith("css") ? "css" : "typescript",
  });
  if (process.argv.includes("--check")) {
    if ((await readFile(target, "utf8")).replace(/\r\n/g, "\n") !== formatted) {
      throw new Error(`${file} is stale. Run npm run design:tokens.`);
    }
  } else await writeFile(target, formatted);
}
