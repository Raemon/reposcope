export interface SourceLocation {
  file: string;
  line: number;
  excerpt: string;
}

export type EntryPointKind = 'http' | 'websocket' | 'graphql' | 'cli';

export interface EntryPoint {
  kind: EntryPointKind;
  method: string;
  name: string;
  framework: string;
  language: string;
  at: SourceLocation;
}

export interface LanguageShare {
  language: string;
  files: number;
  lines: number;
}

export interface MapSymbol {
  kind: string;
  name: string;
  at: SourceLocation;
}

export interface MapNode {
  name: string;
  path: string;
  files: number;
  codeLines: number;
  languages: LanguageShare[];
  symbols: MapSymbol[];
  gloss: string | null;
  children: MapNode[];
}

export interface DependencyEntry {
  name: string;
  version: string;
  group: 'runtime' | 'dev';
  usedIn: number;
}

export interface DependencyManifest {
  file: string;
  ecosystem: string;
  lockfile: string | null;
  entries: DependencyEntry[];
}

export interface EnvVarUse {
  name: string;
  documented: boolean;
  sites: SourceLocation[];
}

export interface PortUse {
  port: number;
  at: SourceLocation;
}

export interface RunnableScript {
  name: string;
  command: string;
  file: string;
}

export interface WorkflowInfo {
  name: string;
  file: string;
  triggers: string;
}

export interface RuntimeSurface {
  envVars: EnvVarUse[];
  ports: PortUse[];
  scripts: RunnableScript[];
  workflows: WorkflowInfo[];
  containers: string[];
}

export interface ModelField {
  name: string;
  type: string;
}

export interface DataModel {
  name: string;
  kind: string;
  fields: ModelField[];
  at: SourceLocation;
}

export interface TestCase {
  name: string;
  line: number;
}

export interface TestFile {
  file: string;
  framework: string;
  caseCount: number;
  cases: TestCase[];
}

export interface TestSurface {
  files: TestFile[];
  caseCount: number;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface ActivitySummary {
  commits: CommitInfo[];
  note: string | null;
}

export interface RepoInsights {
  languages: LanguageShare[];
  entryPoints: EntryPoint[];
  map: MapNode;
  dependencies: DependencyManifest[];
  runtime: RuntimeSurface;
  models: DataModel[];
  tests: TestSurface;
  activity: ActivitySummary | null;
}
