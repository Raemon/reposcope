import type { RepoSurfacePayload } from '@/features/codebases/repoSurfacePayload';

export type SurfaceViewId =
  | 'api'
  | 'entry'
  | 'map'
  | 'dependencies'
  | 'runtime'
  | 'models'
  | 'tests'
  | 'activity';

export const surfaceViewLabels: Record<SurfaceViewId, string> = {
  api: 'API surface',
  entry: 'Entry points',
  map: 'Map',
  dependencies: 'Dependencies',
  runtime: 'Runtime',
  models: 'Data models',
  tests: 'Tests',
  activity: 'Activity',
};

export interface SurfaceView {
  id: SurfaceViewId;
  label: string;
  count: number | null;
  available: boolean;
  reason: string;
  hint: string;
}

export function surfaceViews(surface: RepoSurfacePayload): SurfaceView[] {
  const { endpoints, routes, insights } = surface;
  const runtimeCount =
    insights.runtime.envVars.length + insights.runtime.ports.length + insights.runtime.scripts.length +
    insights.runtime.workflows.length + insights.runtime.containers.length;
  return [
    view('api', endpoints.length + routes.length,
      'No Next.js route handlers, Express-style registrations, or page trees were found in the TypeScript/JavaScript sources.',
      'Traced TypeScript server boundary: endpoints, their code paths, types, and the page tree.'),
    view('entry', insights.entryPoints.length,
      'No HTTP routes, CLI commands, or GraphQL fields were recognized in any language.',
      'Every way in, across languages: HTTP routes, WebSockets, GraphQL fields, CLI commands.'),
    view('map', insights.map.files,
      'The repository appears to be empty.',
      'The directory tree: where the code lives, in which languages, and the symbols each area defines.'),
    view('dependencies', insights.dependencies.reduce((sum, held) => sum + held.entries.length, 0),
      'No dependency manifests (package.json, pyproject.toml, go.mod, Cargo.toml, Gemfile…) were found.',
      'What the codebase leans on, per manifest, with how widely each package is imported.'),
    view('runtime', runtimeCount,
      'No environment variables, ports, scripts, workflows, or container files were detected.',
      'What it needs to run: env vars, ports, runnable scripts, CI workflows, containers.'),
    view('models', insights.models.length,
      'No database schemas or ORM models (Prisma, SQL, Django, SQLAlchemy, ActiveRecord, gorm, drizzle…) were detected.',
      'What it stores: every table and ORM model with its fields.'),
    view('tests', insights.tests.caseCount,
      'No test files with recognizable test cases were found.',
      'What behavior is pinned down: each test file and the cases it declares.'),
    view('activity', insights.activity?.commits.length ?? null,
      'Recent commits could not be fetched from GitHub (rate limit or network). Connect GitHub and reload.',
      'The last commits: who changed what, when.'),
  ];
}

export function defaultViewId(views: SurfaceView[]): SurfaceViewId {
  for (const id of ['api', 'entry', 'map'] as const) {
    const held = views.find((view) => view.id === id);
    if (held?.available) return id;
  }
  return 'map';
}

function view(id: SurfaceViewId, count: number | null, reason: string, hint: string): SurfaceView {
  return { id, label: surfaceViewLabels[id], count, available: count !== null && count > 0, reason, hint };
}
