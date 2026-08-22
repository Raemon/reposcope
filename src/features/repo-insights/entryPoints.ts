import { isTestPath, languageOf } from './languageOf';
import { fileNameOf, locationAt, scanned, type ScannedFile } from './lineScan';
import type { CodebaseFile } from '@/features/codebases/codebaseSource';
import type { EntryPoint, EntryPointKind } from './insightTypes';

const MAX_ENTRY_POINTS = 500;
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'ANY']);

type Push = (kind: EntryPointKind, method: string, name: string, framework: string, file: ScannedFile, lineIndex: number) => void;
type Scanner = (file: ScannedFile, push: Push) => void;

export function discoverEntryPoints(files: CodebaseFile[], claimed: Set<string>): EntryPoint[] {
  const found: EntryPoint[] = [];
  const seen = new Set(claimed);
  const push: Push = (kind, method, name, framework, file, lineIndex) => {
    const shown = kind === 'http' || kind === 'websocket' ? normalizedPath(name) : name;
    const key = `${kind} ${method} ${shown}`;
    if (seen.has(key) || found.length >= MAX_ENTRY_POINTS) return;
    seen.add(key);
    found.push({ kind, method, name: shown, framework, language: languageOf(file.path) ?? 'other', at: locationAt(file, lineIndex) });
  };
  for (const source of files) {
    const scanners = scannersFor(source.path);
    if (scanners.length === 0) continue;
    const file = scanned(source);
    for (const scan of scanners) scan(file, push);
  }
  return sortEntryPoints(found);
}

function scannersFor(path: string): Scanner[] {
  if (isTestPath(path)) return [];
  const name = fileNameOf(path).toLowerCase();
  const scanners: Scanner[] = [];
  if (path.endsWith('.py')) {
    scanners.push(pythonDecoratorRoutes, pythonFlaskRoutes, pythonCliCommands, pythonArgparseCommands);
    if (name === 'urls.py') scanners.push(djangoUrlRoutes);
  }
  if (path.endsWith('.go')) scanners.push(goRoutes, goCobraCommands);
  if (path.endsWith('.rs')) scanners.push(rustAxumRoutes, rustAttributeRoutes, rustClapCommands);
  if (path.endsWith('.rb')) {
    scanners.push(name === 'routes.rb' ? railsRoutes : sinatraRoutes);
  }
  if (path.endsWith('.php')) scanners.push(laravelRoutes);
  if (path.endsWith('.java') || path.endsWith('.kt')) scanners.push(springRoutes);
  if (path.endsWith('.cs')) scanners.push(dotnetRoutes);
  if (/\.(?:ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(path)) {
    scanners.push(nestRoutes, jsRouterRoutes, jsCliCommands, oclifCommands, graphqlInTemplates);
  }
  if (path.endsWith('.graphql') || path.endsWith('.gql')) scanners.push(graphqlSchemaFields);
  return scanners;
}

function sortEntryPoints(found: EntryPoint[]): EntryPoint[] {
  const rank: Record<EntryPointKind, number> = { http: 0, websocket: 1, graphql: 2, cli: 3 };
  return found.sort((left, right) =>
    rank[left.kind] - rank[right.kind] || left.name.localeCompare(right.name) || left.method.localeCompare(right.method),
  );
}

function pythonFramework(file: ScannedFile): string {
  if (file.source.includes('fastapi')) return 'fastapi';
  if (file.source.includes('flask') || file.source.includes('Flask')) return 'flask';
  if (file.source.includes('aiohttp')) return 'aiohttp';
  return 'python';
}

const PYTHON_METHOD_DECORATOR = /^\s*@[\w.]+\.(get|post|put|patch|delete|head|options|websocket)\(\s*(['"])([^'"]+)\2/;

function pythonDecoratorRoutes(file: ScannedFile, push: Push): void {
  file.lines.forEach((line, at) => {
    const match = line.match(PYTHON_METHOD_DECORATOR);
    if (!match) return;
    const method = match[1]!.toUpperCase();
    if (method === 'WEBSOCKET') push('websocket', 'WS', match[3]!, pythonFramework(file), file, at);
    else push('http', method, match[3]!, pythonFramework(file), file, at);
  });
}

const PYTHON_ROUTE_DECORATOR = /^\s*@[\w.]+\.route\(\s*(['"])([^'"]+)\1(?:.*methods\s*=\s*\[([^\]]*)\])?/;

function pythonFlaskRoutes(file: ScannedFile, push: Push): void {
  file.lines.forEach((line, at) => {
    const match = line.match(PYTHON_ROUTE_DECORATOR);
    if (!match) return;
    const methods = (match[3] ?? '')
      .split(',')
      .map((held) => held.replace(/['"\s]/g, '').toUpperCase())
      .filter((held) => HTTP_METHODS.has(held));
    for (const method of methods.length > 0 ? methods : ['GET']) {
      push('http', method, match[2]!, pythonFramework(file), file, at);
    }
  });
}

const DJANGO_PATH = /(?:^|[\s(\[])(?:re_)?path\(\s*r?(['"])([^'"]*)\1/;

function djangoUrlRoutes(file: ScannedFile, push: Push): void {
  file.lines.forEach((line, at) => {
    const match = line.match(DJANGO_PATH);
    if (!match) return;
    const raw = match[2]!.replace(/^\^/, '').replace(/\$$/, '');
    push('http', 'ANY', raw.startsWith('/') ? raw : `/${raw}`, 'django', file, at);
  });
}

const PYTHON_COMMAND = /^\s*@([\w.]+)\.(command|group)\(\s*(?:(['"])([^'"]+)\3)?/;
const PYTHON_DEF = /^\s*(?:async\s+)?def\s+(\w+)/;

function pythonCliCommands(file: ScannedFile, push: Push): void {
  const framework = file.source.includes('typer') ? 'typer' : 'click';
  if (!file.source.includes('click') && !file.source.includes('typer')) return;
  file.lines.forEach((line, at) => {
    const match = line.match(PYTHON_COMMAND);
    if (!match) return;
    const explicit = match[4];
    const name = explicit ?? nearbyDefName(file, at);
    if (name) push('cli', match[2] === 'group' ? 'GROUP' : 'CMD', name.replace(/_/g, '-'), framework, file, at);
  });
}

function nearbyDefName(file: ScannedFile, decoratorAt: number): string | null {
  for (let at = decoratorAt + 1; at < Math.min(decoratorAt + 6, file.lines.length); at += 1) {
    const match = file.lines[at]!.match(PYTHON_DEF);
    if (match) return match[1]!;
  }
  return null;
}

const ARGPARSE_SUBCOMMAND = /add_parser\(\s*(['"])([^'"]+)\1/;

function pythonArgparseCommands(file: ScannedFile, push: Push): void {
  file.lines.forEach((line, at) => {
    const match = line.match(ARGPARSE_SUBCOMMAND);
    if (match) push('cli', 'CMD', match[2]!, 'argparse', file, at);
  });
}

const GO_HANDLE = /\bHandle(?:Func)?\(\s*"((?:[A-Z]+ )?\/[^"]*)"/;
const GO_ROUTER_METHOD = /\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|Any|Get|Post|Put|Patch|Delete|Head|Options)\(\s*"(\/[^"]*)"/;

function goFramework(file: ScannedFile): string {
  if (file.source.includes('gin-gonic')) return 'gin';
  if (file.source.includes('labstack/echo')) return 'echo';
  if (file.source.includes('go-chi')) return 'chi';
  if (file.source.includes('gofiber')) return 'fiber';
  return 'go-http';
}

function goRoutes(file: ScannedFile, push: Push): void {
  file.lines.forEach((line, at) => {
    const handle = line.match(GO_HANDLE);
    if (handle) {
      const [method, path] = splitGoPattern(handle[1]!);
      push('http', method, path, 'go-http', file, at);
      return;
    }
    const routed = line.match(GO_ROUTER_METHOD);
    if (routed) {
      const method = routed[1]!.toUpperCase();
      push('http', method === 'ANY' ? 'ANY' : method, routed[2]!, goFramework(file), file, at);
    }
  });
}

function splitGoPattern(pattern: string): [string, string] {
  const spaced = pattern.match(/^([A-Z]+) (\/.*)$/);
  return spaced ? [spaced[1]!, spaced[2]!] : ['ANY', pattern];
}

const GO_COBRA_USE = /\bUse:\s*"([^"\s]+)/;

function goCobraCommands(file: ScannedFile, push: Push): void {
  if (!file.source.includes('cobra.Command')) return;
  file.lines.forEach((line, at) => {
    const match = line.match(GO_COBRA_USE);
    if (match) push('cli', 'CMD', match[1]!, 'cobra', file, at);
  });
}

const RUST_AXUM_ROUTE = /\.route\(\s*"([^"]+)"\s*,\s*(?:[\w:]+::)?(get|post|put|patch|delete|head|options|any)\(/;

function rustAxumRoutes(file: ScannedFile, push: Push): void {
  file.lines.forEach((line, at) => {
    const match = line.match(RUST_AXUM_ROUTE);
    if (match) push('http', match[2]!.toUpperCase(), match[1]!, 'axum', file, at);
  });
}

const RUST_ROUTE_ATTRIBUTE = /^\s*#\[(get|post|put|patch|delete|head|options)\(\s*"([^"]+)"/;

function rustAttributeRoutes(file: ScannedFile, push: Push): void {
  const framework = file.source.includes('actix') ? 'actix-web' : 'rocket';
  file.lines.forEach((line, at) => {
    const match = line.match(RUST_ROUTE_ATTRIBUTE);
    if (match) push('http', match[1]!.toUpperCase(), match[2]!, framework, file, at);
  });
}

const RUST_CLAP_COMMAND = /\b(?:Command|App|SubCommand)::(?:new|with_name)\(\s*"([^"]+)"/;

function rustClapCommands(file: ScannedFile, push: Push): void {
  if (!file.source.includes('clap')) return;
  file.lines.forEach((line, at) => {
    const match = line.match(RUST_CLAP_COMMAND);
    if (match) push('cli', 'CMD', match[1]!, 'clap', file, at);
  });
}

const RAILS_VERB = /^\s*(get|post|put|patch|delete)\s+['"]([^'"]+)['"]/;
const RAILS_RESOURCES = /^\s*(resources?)\s+:(\w+)/;

function railsRoutes(file: ScannedFile, push: Push): void {
  file.lines.forEach((line, at) => {
    const verb = line.match(RAILS_VERB);
    if (verb) {
      const path = verb[2]!.startsWith('/') ? verb[2]! : `/${verb[2]!}`;
      push('http', verb[1]!.toUpperCase(), path, 'rails', file, at);
      return;
    }
    const resources = line.match(RAILS_RESOURCES);
    if (resources) push('http', 'REST', `/${resources[2]!}`, 'rails', file, at);
  });
}

const SINATRA_VERB = /^\s*(get|post|put|patch|delete|options|head)\s+(['"])(\/[^'"]*)\2/;

function sinatraRoutes(file: ScannedFile, push: Push): void {
  file.lines.forEach((line, at) => {
    const match = line.match(SINATRA_VERB);
    if (match) push('http', match[1]!.toUpperCase(), match[3]!, 'sinatra', file, at);
  });
}

const LARAVEL_ROUTE = /\bRoute::(get|post|put|patch|delete|any)\(\s*(['"])([^'"]+)\2/;

function laravelRoutes(file: ScannedFile, push: Push): void {
  file.lines.forEach((line, at) => {
    const match = line.match(LARAVEL_ROUTE);
    if (match) {
      const path = match[3]!.startsWith('/') ? match[3]! : `/${match[3]!}`;
      push('http', match[1]!.toUpperCase(), path, 'laravel', file, at);
    }
  });
}

const SPRING_CLASS_MAPPING = /^\s*@RequestMapping\(\s*(?:value\s*=\s*|path\s*=\s*)?"([^"]*)"/;
const SPRING_METHOD_MAPPING = /^\s*@(Get|Post|Put|Patch|Delete|Request)Mapping(?:\(\s*(?:value\s*=\s*|path\s*=\s*)?"([^"]*)")?/;

function springRoutes(file: ScannedFile, push: Push): void {
  let base = '';
  file.lines.forEach((line, at) => {
    const classLevel = line.match(SPRING_CLASS_MAPPING);
    const method = line.match(SPRING_METHOD_MAPPING);
    if (classLevel && (!method || method[1] === 'Request')) {
      if (nextCodeLineStartsClass(file, at)) {
        base = classLevel[1]!;
        return;
      }
    }
    if (!method) return;
    const verb = method[1] === 'Request' ? 'ANY' : method[1]!.toUpperCase();
    push('http', verb, joinPaths(base, method[2] ?? ''), 'spring', file, at);
  });
}

function nextCodeLineStartsClass(file: ScannedFile, mappingAt: number): boolean {
  for (let at = mappingAt + 1; at < Math.min(mappingAt + 8, file.lines.length); at += 1) {
    const line = file.lines[at]!.trim();
    if (line === '' || line.startsWith('@') || line.startsWith('//')) continue;
    return /\b(?:class|interface)\b/.test(line);
  }
  return false;
}

const DOTNET_HTTP_ATTRIBUTE = /^\s*\[Http(Get|Post|Put|Patch|Delete)(?:\(\s*"([^"]*)"\s*\))?\]/;
const DOTNET_MINIMAL = /\b(?:app|group)\.Map(Get|Post|Put|Patch|Delete)\(\s*"([^"]+)"/;

function dotnetRoutes(file: ScannedFile, push: Push): void {
  file.lines.forEach((line, at) => {
    const attribute = line.match(DOTNET_HTTP_ATTRIBUTE);
    if (attribute) push('http', attribute[1]!.toUpperCase(), attribute[2] ?? '(controller)', 'aspnet', file, at);
    const minimal = line.match(DOTNET_MINIMAL);
    if (minimal) push('http', minimal[1]!.toUpperCase(), minimal[2]!, 'aspnet-minimal', file, at);
  });
}

const NEST_CONTROLLER = /@Controller\(\s*(?:(['"])([^'"]*)\1)?\s*\)/;
const NEST_METHOD = /^\s*@(Get|Post|Put|Patch|Delete|Options|Head|All)\(\s*(?:(['"])([^'"]*)\2)?\s*\)/;

function nestRoutes(file: ScannedFile, push: Push): void {
  if (!file.source.includes('@nestjs/common')) return;
  let base = '';
  file.lines.forEach((line, at) => {
    const controller = line.match(NEST_CONTROLLER);
    if (controller) {
      base = controller[2] ?? '';
      return;
    }
    const method = line.match(NEST_METHOD);
    if (!method) return;
    const verb = method[1] === 'All' ? 'ANY' : method[1]!.toUpperCase();
    push('http', verb, joinPaths(base, method[3] ?? ''), 'nestjs', file, at);
  });
}

const JS_ROUTER_CALL = /\b(?:app|router|server|api|routes|hono)\.(get|post|put|patch|delete|all)\(\s*(['"`])(\/[^'"`]*)\2/;

function jsRouterRoutes(file: ScannedFile, push: Push): void {
  file.lines.forEach((line, at) => {
    const match = line.match(JS_ROUTER_CALL);
    if (!match) return;
    const framework = file.source.includes('hono') ? 'hono' : file.source.includes('express') ? 'express' : 'js-router';
    push('http', match[1] === 'all' ? 'ANY' : match[1]!.toUpperCase(), match[3]!, framework, file, at);
  });
}

const JS_COMMAND = /\.command\(\s*(['"`])([^'"`]+)\1/;

function jsCliCommands(file: ScannedFile, push: Push): void {
  if (!file.source.includes('commander') && !file.source.includes('yargs')) return;
  const framework = file.source.includes('commander') ? 'commander' : 'yargs';
  file.lines.forEach((line, at) => {
    const match = line.match(JS_COMMAND);
    if (!match) return;
    const name = match[2]!.split(/\s/)[0]!;
    if (name !== '*' && name !== '$0') push('cli', 'CMD', name, framework, file, at);
  });
}

const OCLIF_COMMAND_PATH = /(?:^|\/)src\/commands\/(.+)\.(?:ts|js)$/;

function oclifCommands(file: ScannedFile, push: Push): void {
  const match = file.path.match(OCLIF_COMMAND_PATH);
  if (!match || !file.source.includes('extends Command')) return;
  const name = match[1]!.split('/').filter((segment) => segment !== 'index').join(':');
  if (name !== '') push('cli', 'CMD', name, 'oclif', file, 0);
}

const GRAPHQL_ROOT_TYPE = /^\s*(?:extend\s+)?type\s+(Query|Mutation|Subscription)\b/;
const GRAPHQL_FIELD = /^\s{2,}(\w+)\s*(?:\([^)]*\))?\s*:/;

function graphqlSchemaFields(file: ScannedFile, push: Push): void {
  let root: string | null = null;
  file.lines.forEach((line, at) => {
    const rootMatch = line.match(GRAPHQL_ROOT_TYPE);
    if (rootMatch) {
      root = rootMatch[1]!.toUpperCase();
      return;
    }
    if (root && /^\s*}/.test(line)) {
      root = null;
      return;
    }
    if (!root) return;
    const field = line.match(GRAPHQL_FIELD);
    if (field) push('graphql', root, field[1]!, 'graphql-schema', file, at);
  });
}

function graphqlInTemplates(file: ScannedFile, push: Push): void {
  if (!file.source.includes('gql`') && !file.source.includes('graphql`')) return;
  graphqlSchemaFields(file, push);
}

function normalizedPath(path: string): string {
  return path
    .replace(/<(?:[\w.]+:)?([\w]+)>/g, '{$1}')
    .replace(/:([A-Za-z0-9_]+)\??/g, '{$1}')
    .replace(/\*+([\w]*)/g, (_, name: string) => `{${name || 'rest'}}`)
    .replace(/\/$/, '') || '/';
}

function joinPaths(base: string, sub: string): string {
  const left = base.replace(/^\/|\/$/g, '');
  const right = sub.replace(/^\/|\/$/g, '');
  const joined = [left, right].filter((part) => part !== '').join('/');
  return `/${joined}`;
}
