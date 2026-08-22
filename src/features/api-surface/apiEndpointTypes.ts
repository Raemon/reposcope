import type ts from 'typescript';

export interface ApiCodeStep {
  symbol: string;
  file: string;
  line: number;
  excerpt: string;
  calls: ApiCodeStep[];
}

export interface ApiConsumer {
  symbol: string;
  file: string;
  line: number;
  excerpt: string;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  framework: ApiFramework;
  transport: 'http' | 'websocket';
  code: ApiCodeStep;
  consumers: ApiConsumer[];
  signature: ApiSignature;
}

export interface ApiSourceIndex {
  files: Map<string, IndexedApiFile>;
}

export interface IndexedApiFile {
  path: string;
  source: string;
  ast: ts.SourceFile;
  declarations: Map<string, ts.Node>;
  imports: Map<string, ApiImportRef>;
}

export interface ApiImportRef {
  imported: string;
  module: string;
}

export interface ApiDeclarationRef {
  file: IndexedApiFile;
  node: ts.Node;
  symbol: string;
}

export interface ApiConsumerCandidate extends ApiConsumer {
  method: string | null;
  path: string;
}

export type ApiInputSource = 'path' | 'query' | 'body' | 'header';

export interface ApiInput {
  name: string;
  type: string;
  source: ApiInputSource;
  optional: boolean;
  help: string;
}

export interface ApiOutputField {
  name: string;
  type: string;
}

export interface ApiOutputType {
  name: string;
  file: string;
  line: number;
  through: string;
}

export interface ApiOutput {
  status: number;
  type: string;
  fields: ApiOutputField[];
  types: ApiOutputType[];
}

export interface ApiSignature {
  summary: string;
  inputs: ApiInput[];
  outputs: ApiOutput[];
}

export type ApiFramework = 'next-app-router' | 'next-pages-router' | 'registered-route' | 'websocket';
