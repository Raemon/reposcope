import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = 'src';

const ALLOWED = new Map([
  ['src/features/codebases/githubRequest.ts', 'the cached GitHub transport'],
  ['src/app/api/github/callback/route.ts', 'the OAuth code exchange, which carries no repository data'],
  ['src/features/sources/apiClient.ts', 'browser calls to this app of its own API routes'],
]);

const violations = [];
for (const file of await sourceFiles(ROOT)) {
  if (ALLOWED.has(file)) continue;
  const lines = (await readFile(file, 'utf8')).split('\n');
  lines.forEach((line, index) => {
    if (/(?<![.\w])fetch\s*\(/.test(line)) violations.push(`${file}:${index + 1}: ${line.trim()}`);
  });
}

if (violations.length) {
  console.error('Uncached GitHub access is not allowed. Use githubJson/githubBytes/githubSend instead of fetch:\n');
  for (const violation of violations) console.error(`  ${violation}`);
  console.error('\nCalling fetch directly is only permitted in:');
  for (const [file, reason] of ALLOWED) console.error(`  ${file} — ${reason}`);
  process.exit(1);
}

console.log(`GitHub caching check passed; fetch is confined to ${ALLOWED.size} reviewed call sites.`);

async function sourceFiles(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await sourceFiles(path)));
    else if (/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(entry.name)) found.push(path);
  }
  return found;
}
