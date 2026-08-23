import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import type { Codebase } from './codebaseSource';

const DIRECTORY = join(tmpdir(), 'reposcope-snapshots');

export async function readSnapshot(owner: string, repo: string, sha: string): Promise<Codebase | null> {
  try {
    const packed = await readFile(join(DIRECTORY, snapshotName(owner, repo, sha)));
    return JSON.parse(gunzipSync(packed).toString('utf8')) as Codebase;
  } catch {
    return null;
  }
}

export async function writeSnapshot(owner: string, repo: string, sha: string, codebase: Codebase): Promise<void> {
  try {
    await mkdir(DIRECTORY, { recursive: true });
    await writeFile(join(DIRECTORY, snapshotName(owner, repo, sha)), gzipSync(JSON.stringify(codebase)));
    await dropStaleSnapshots(owner, repo, sha);
  } catch {
    return;
  }
}

async function dropStaleSnapshots(owner: string, repo: string, keptSha: string): Promise<void> {
  const kept = snapshotName(owner, repo, keptSha);
  const prefix = `${repoPrefix(owner, repo)}~`;
  for (const name of await readdir(DIRECTORY)) {
    if (name.startsWith(prefix) && name !== kept) await rm(join(DIRECTORY, name), { force: true });
  }
}

function snapshotName(owner: string, repo: string, sha: string): string {
  return `${repoPrefix(owner, repo)}~${sha}.json.gz`;
}

function repoPrefix(owner: string, repo: string): string {
  return `${encodeURIComponent(owner)}~${encodeURIComponent(repo)}`;
}
