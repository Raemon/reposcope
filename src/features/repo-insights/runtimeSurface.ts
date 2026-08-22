import { fileNameOf, locationAt, scanned, type ScannedFile } from './lineScan';
import type { CodebaseFile, InventoryEntry } from '@/features/codebases/codebaseSource';
import type { EnvVarUse, PortUse, RunnableScript, RuntimeSurface, SourceLocation, WorkflowInfo } from './insightTypes';

const MAX_ENV_VARS = 120;
const MAX_SITES_PER_VAR = 6;
const MAX_PORTS = 20;
const MAX_SCRIPTS = 60;
const MAX_WORKFLOWS = 30;

const ENV_PATTERNS = [
  /process\.env\.([A-Z][A-Z0-9_]+)/g,
  /process\.env\[['"]([A-Z][A-Z0-9_]+)['"]\]/g,
  /import\.meta\.env\.([A-Z][A-Z0-9_]+)/g,
  /os\.environ(?:\.get)?\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g,
  /os\.environ\[['"]([A-Z][A-Z0-9_]+)['"]\]/g,
  /os\.getenv\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g,
  /os\.(?:Getenv|LookupEnv)\(\s*"([A-Z][A-Z0-9_]+)"/g,
  /env::var(?:_os)?\(\s*"([A-Z][A-Z0-9_]+)"/g,
  /ENV(?:\.fetch\(\s*|\[)['"]([A-Z][A-Z0-9_]+)['"]/g,
  /System\.getenv\(\s*"([A-Z][A-Z0-9_]+)"/g,
];

const PORT_PATTERNS = [
  /\.listen\(\s*(\d{2,5})\b/,
  /ListenAndServe\(\s*":(\d{2,5})"/,
  /\.run\([^)]*port\s*=\s*(\d{2,5})/,
  /--port[= ](\d{2,5})\b/,
  /^EXPOSE\s+(\d{2,5})/,
];

const ENV_EXAMPLE_NAMES = ['.env.example', '.env.sample', '.env.template', '.env.dist', '.flaskenv'];

export function buildRuntimeSurface(files: CodebaseFile[], inventory: InventoryEntry[]): RuntimeSurface {
  const documented = documentedEnvKeys(files);
  const uses = new Map<string, SourceLocation[]>();
  const ports: PortUse[] = [];
  const scripts: RunnableScript[] = [];
  const workflows: WorkflowInfo[] = [];
  for (const source of files) {
    const file = scanned(source);
    collectEnvVars(file, uses);
    collectPorts(file, ports);
    collectScripts(file, scripts);
    collectWorkflow(file, workflows);
  }
  const envVars: EnvVarUse[] = [...uses]
    .map(([name, sites]) => ({ name, documented: documented.has(name), sites }))
    .sort((left, right) => right.sites.length - left.sites.length || left.name.localeCompare(right.name));
  for (const name of documented) {
    if (!uses.has(name) && envVars.length < MAX_ENV_VARS) envVars.push({ name, documented: true, sites: [] });
  }
  return {
    envVars: envVars.slice(0, MAX_ENV_VARS),
    ports: ports.slice(0, MAX_PORTS),
    scripts: scripts.slice(0, MAX_SCRIPTS),
    workflows: workflows.slice(0, MAX_WORKFLOWS),
    containers: containerFiles(inventory),
  };
}

function documentedEnvKeys(files: CodebaseFile[]): Set<string> {
  const keys = new Set<string>();
  for (const file of files) {
    if (!ENV_EXAMPLE_NAMES.includes(fileNameOf(file.path).toLowerCase())) continue;
    for (const line of file.source.split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]+)\s*=/);
      if (match) keys.add(match[1]!);
    }
  }
  return keys;
}

function collectEnvVars(file: ScannedFile, uses: Map<string, SourceLocation[]>): void {
  file.lines.forEach((line, at) => {
    for (const pattern of ENV_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of line.matchAll(pattern)) {
        const name = match[1]!;
        if (name === 'NODE_ENV') continue;
        const sites = uses.get(name) ?? [];
        if (uses.size >= MAX_ENV_VARS && !uses.has(name)) continue;
        const already = sites.some((held) => held.file === file.path && held.line === at + 1);
        if (!already && sites.length < MAX_SITES_PER_VAR) sites.push(locationAt(file, at));
        uses.set(name, sites);
      }
    }
  });
}

function collectPorts(file: ScannedFile, ports: PortUse[]): void {
  file.lines.forEach((line, at) => {
    for (const pattern of PORT_PATTERNS) {
      const match = line.match(pattern);
      if (!match) continue;
      const port = Number(match[1]);
      if (port < 80 || port > 65535 || ports.some((held) => held.port === port)) continue;
      if (ports.length < MAX_PORTS) ports.push({ port, at: locationAt(file, at) });
    }
  });
}

function collectScripts(file: ScannedFile, scripts: RunnableScript[]): void {
  const name = fileNameOf(file.path).toLowerCase();
  if (name === 'package.json') packageScripts(file, scripts);
  else if (name === 'makefile' || name === 'justfile') makeTargets(file, scripts);
  else if (name === 'procfile') procfileEntries(file, scripts);
  else if (name === 'pyproject.toml') pyprojectScripts(file, scripts);
}

function packageScripts(file: ScannedFile, scripts: RunnableScript[]): void {
  try {
    const parsed = JSON.parse(file.source) as { scripts?: Record<string, string> };
    for (const [name, command] of Object.entries(parsed.scripts ?? {})) {
      scripts.push({ name, command, file: file.path });
    }
  } catch {
    return;
  }
}

const MAKE_TARGET = /^([A-Za-z][\w.-]*)\s*:(?!=)/;

function makeTargets(file: ScannedFile, scripts: RunnableScript[]): void {
  file.lines.forEach((line, at) => {
    const match = line.match(MAKE_TARGET);
    if (!match || match[1] === 'else' || match[1] === 'endif') return;
    if (scripts.some((held) => held.file === file.path && held.name === match[1])) return;
    const command = (file.lines[at + 1] ?? '').trim();
    scripts.push({ name: match[1]!, command: command.length > 100 ? `${command.slice(0, 100)}…` : command, file: file.path });
  });
}

function procfileEntries(file: ScannedFile, scripts: RunnableScript[]): void {
  file.lines.forEach((line) => {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) scripts.push({ name: match[1]!, command: match[2]!, file: file.path });
  });
}

function pyprojectScripts(file: ScannedFile, scripts: RunnableScript[]): void {
  let inScripts = false;
  file.lines.forEach((line) => {
    const trimmed = line.trim();
    if (/^\[project\.scripts\]/.test(trimmed)) {
      inScripts = true;
      return;
    }
    if (trimmed.startsWith('[')) {
      inScripts = false;
      return;
    }
    if (!inScripts) return;
    const match = trimmed.match(/^([\w-]+)\s*=\s*["']([^"']+)["']/);
    if (match) scripts.push({ name: match[1]!, command: match[2]!, file: file.path });
  });
}

function collectWorkflow(file: ScannedFile, workflows: WorkflowInfo[]): void {
  if (!file.path.includes('.github/workflows/')) return;
  let name = fileNameOf(file.path);
  let inline = '';
  const blockTriggers: string[] = [];
  for (const line of file.lines) {
    const named = line.match(/^name:\s*['"]?([^'"#]+)/);
    if (named && name === fileNameOf(file.path)) name = named[1]!.trim();
    const on = line.match(/^(?:on|'on'|"on"):\s*(.+)$/);
    if (on) inline = on[1]!.replace(/[[\]'"]/g, '').trim();
    const block = line.match(/^\s{2}(push|pull_request|pull_request_target|schedule|workflow_dispatch|release|workflow_call|issues|merge_group):/);
    if (block && !blockTriggers.includes(block[1]!)) blockTriggers.push(block[1]!);
  }
  workflows.push({ name, file: file.path, triggers: inline !== '' ? inline : blockTriggers.join(', ') });
}

function containerFiles(inventory: InventoryEntry[]): string[] {
  return inventory
    .map((entry) => entry.path)
    .filter((path) => {
      const name = fileNameOf(path).toLowerCase();
      return name.startsWith('dockerfile') || name.startsWith('docker-compose') || name === 'compose.yml' || name === 'compose.yaml';
    })
    .slice(0, 12);
}
