import { AppRouteTree } from './AppRouteTree';
import type { AppRoute, AppRouteComponent } from './appRouteCatalog';

export function AppRouteDocumentation({ routes }: { routes: AppRoute[] }) {
  const componentCount = routes.reduce((total, route) => total + route.components.reduce(countComponents, 0), 0);

  return (
    <section aria-labelledby="routes-heading" className="min-w-0">
      <div className="mb-3 max-w-[22rem] border-b border-panel-edge pb-3">
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">Rendered from the page tree</p>
        <h2 id="routes-heading" className="text-xl text-accent">Browser surface</h2>
        <p className="mt-1 text-xs leading-5 text-ink-dim">
          Each URL a person can open, the components it nests, and the API calls those components make.
        </p>
        <p className="mt-2 font-mono text-[11px] text-ink-dim">
          {routes.length} routes · {componentCount} components
        </p>
      </div>
      <div className="w-fit max-w-[38rem] overflow-x-auto rounded border border-panel-edge bg-panel">
        <table className="table-auto border-collapse">
          <caption className="sr-only">URL routes, their nested components, and the API calls those components make</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Component</th>
              <th scope="col">API calls</th>
            </tr>
          </thead>
          <tbody>
            <AppRouteTree routes={routes} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function countComponents(total: number, component: AppRouteComponent): number {
  return component.children.reduce(countComponents, total + 1);
}
