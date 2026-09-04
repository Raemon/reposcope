import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const SOURCE = 'node_modules/typescript/lib';
const TARGET = 'public/typescript';

await mkdir(TARGET, { recursive: true });
const libs = (await readdir(SOURCE)).filter((file) => /^lib\..*\.d\.ts$/.test(file));
for (const file of libs) await copyFile(join(SOURCE, file), join(TARGET, file));
console.log(`Copied ${libs.length} TypeScript lib files to ${TARGET}`);
