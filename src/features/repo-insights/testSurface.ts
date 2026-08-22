import { isTestPath } from './languageOf';
import { scanned, type ScannedFile } from './lineScan';
import type { CodebaseFile } from '@/features/codebases/codebaseSource';
import type { TestCase, TestFile, TestSurface } from './insightTypes';

const MAX_TEST_FILES = 250;
const MAX_CASES_SHOWN = 12;

interface CasePattern {
  framework: string;
  extensions: RegExp;
  pattern: RegExp;
  nameGroup: number;
}

const CASE_PATTERNS: CasePattern[] = [
  { framework: 'js', extensions: /\.(?:ts|tsx|js|jsx|mts|cts|mjs|cjs)$/, pattern: /^\s*(?:describe|it|test)(?:\.\w+)?\(\s*(['"`])(.*?)\1/, nameGroup: 2 },
  { framework: 'pytest', extensions: /\.py$/, pattern: /^\s*(?:async\s+)?def\s+(test_\w+)/, nameGroup: 1 },
  { framework: 'go-test', extensions: /_test\.go$/, pattern: /^func\s+(Test\w+|Example\w*|Fuzz\w+)\(/, nameGroup: 1 },
  { framework: 'rspec', extensions: /\.rb$/, pattern: /^\s*(?:it|describe|context|test)\s+(['"])(.*?)\1/, nameGroup: 2 },
  { framework: 'exunit', extensions: /\.exs?$/, pattern: /^\s*test\s+"(.*?)"/, nameGroup: 1 },
];

const RUST_TEST_ATTRIBUTE = /^\s*#\[(?:tokio::)?test/;
const RUST_FN = /^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/;
const JVM_TEST_ATTRIBUTE = /^\s*@(?:Test|ParameterizedTest)\b/;
const JVM_METHOD = /^\s*(?:public\s+)?(?:static\s+)?(?:suspend\s+)?(?:fun\s+|void\s+|\w[\w<>]*\s+)`?([\w ]+?)`?\s*\(/;

export function buildTestSurface(files: CodebaseFile[]): TestSurface {
  const found: TestFile[] = [];
  let caseCount = 0;
  for (const source of files) {
    if (!isTestPath(source.path) && !/_test\.go$/.test(source.path) && !hasRustTestModule(source)) continue;
    const file = scanned(source);
    const collected = casesIn(file);
    if (collected === null || collected.cases.length === 0) continue;
    caseCount += collected.cases.length;
    if (found.length < MAX_TEST_FILES) {
      found.push({
        file: source.path,
        framework: collected.framework,
        caseCount: collected.cases.length,
        cases: collected.cases.slice(0, MAX_CASES_SHOWN),
      });
    }
  }
  found.sort((left, right) => right.caseCount - left.caseCount);
  return { files: found, caseCount };
}

function hasRustTestModule(source: CodebaseFile): boolean {
  return source.path.endsWith('.rs') && source.source.includes('#[test]');
}

function casesIn(file: ScannedFile): { framework: string; cases: TestCase[] } | null {
  if (file.path.endsWith('.rs')) return { framework: 'rust-test', cases: attributeCases(file, RUST_TEST_ATTRIBUTE, RUST_FN) };
  if (/\.(?:java|kt)$/.test(file.path)) return { framework: 'junit', cases: attributeCases(file, JVM_TEST_ATTRIBUTE, JVM_METHOD) };
  const spec = CASE_PATTERNS.find((held) => held.extensions.test(file.path));
  if (!spec) return null;
  const cases: TestCase[] = [];
  file.lines.forEach((line, at) => {
    const match = line.match(spec.pattern);
    if (match) cases.push({ name: match[spec.nameGroup]!, line: at + 1 });
  });
  return { framework: spec.framework, cases };
}

function attributeCases(file: ScannedFile, attribute: RegExp, declaration: RegExp): TestCase[] {
  const cases: TestCase[] = [];
  file.lines.forEach((line, at) => {
    if (!attribute.test(line)) return;
    for (let scan = at + 1; scan < Math.min(at + 6, file.lines.length); scan += 1) {
      const match = file.lines[scan]!.match(declaration);
      if (match) {
        cases.push({ name: match[1]!, line: scan + 1 });
        return;
      }
    }
  });
  return cases;
}
