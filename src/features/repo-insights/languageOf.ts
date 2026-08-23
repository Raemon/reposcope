import { fileNameOf } from './lineScan';

const EXTENSION_LANGUAGES: [string, string][] = [
  ['.tsx', 'TypeScript'], ['.ts', 'TypeScript'], ['.mts', 'TypeScript'], ['.cts', 'TypeScript'],
  ['.jsx', 'JavaScript'], ['.js', 'JavaScript'], ['.mjs', 'JavaScript'], ['.cjs', 'JavaScript'],
  ['.vue', 'Vue'], ['.svelte', 'Svelte'], ['.astro', 'Astro'],
  ['.py', 'Python'], ['.go', 'Go'], ['.rs', 'Rust'], ['.rb', 'Ruby'], ['.php', 'PHP'],
  ['.java', 'Java'], ['.kts', 'Kotlin'], ['.kt', 'Kotlin'], ['.cs', 'C#'], ['.swift', 'Swift'],
  ['.scala', 'Scala'], ['.exs', 'Elixir'], ['.ex', 'Elixir'], ['.erl', 'Erlang'],
  ['.hs', 'Haskell'], ['.lua', 'Lua'], ['.r', 'R'], ['.jl', 'Julia'], ['.zig', 'Zig'],
  ['.dart', 'Dart'], ['.cljs', 'Clojure'], ['.clj', 'Clojure'],
  ['.cpp', 'C++'], ['.hpp', 'C++'], ['.cc', 'C++'], ['.hh', 'C++'], ['.c', 'C'], ['.h', 'C'],
  ['.mm', 'Objective-C'], ['.m', 'Objective-C'],
  ['.sh', 'Shell'], ['.bash', 'Shell'], ['.zsh', 'Shell'], ['.ps1', 'PowerShell'],
  ['.sql', 'SQL'], ['.proto', 'Protobuf'], ['.graphql', 'GraphQL'], ['.gql', 'GraphQL'],
  ['.prisma', 'Prisma'],
];

export function languageOf(path: string): string | null {
  const lower = path.toLowerCase();
  for (const [extension, language] of EXTENSION_LANGUAGES) {
    if (lower.endsWith(extension)) return language;
  }
  return null;
}

export function isTestPath(path: string): boolean {
  const name = fileNameOf(path).toLowerCase();
  if (/(?:^|[._-])(?:test|tests|spec)[._-]/.test(name) || /^test_/.test(name) || /_test\.\w+$/.test(name)) return true;
  return /(?:^|\/)(?:__tests__|tests?|specs?|e2e)\//.test(path.toLowerCase());
}
