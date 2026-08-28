import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const SOURCE = 'node_modules/@vscode/tree-sitter-wasm/wasm';
const TARGET = 'public/tree-sitter';

const GRAMMARS = ['typescript', 'tsx', 'javascript', 'python', 'ruby', 'go', 'rust', 'java', 'cpp', 'c-sharp', 'bash', 'php', 'css'];
const FILES = ['tree-sitter.js', 'tree-sitter.wasm', ...GRAMMARS.map((grammar) => `tree-sitter-${grammar}.wasm`)];

await mkdir(TARGET, { recursive: true });
for (const file of FILES) await copyFile(join(SOURCE, file), join(TARGET, file));
console.log(`Copied ${FILES.length} tree-sitter files to ${TARGET}`);
