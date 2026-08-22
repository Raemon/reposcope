import { AppRouteTree } from './AppRouteTree';
import { InsightPanel, InsightSection } from '@/features/repo-insights/ui/InsightSection';
import type { AppRoute, AppRouteComponent } from './appRouteCatalog';

export function AppRouteDocumentation({ routes }: { routes: AppRoute[] }) {
  const componentCount = routes.reduce((total, route) => total + route.components.reduce(countComponents, 0), 0);

  return (
    <InsightSection
      id="routes"
      kicker="Rendered from the page tree"
      title="Browser surface"
      blurb="Each URL a person can open, the components it nests, and the API calls those components make."
      stat={`${routes.length} routes · ${componentCount} components`}
    >
      <InsightPanel>
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
      </InsightPanel>
    </InsightSection>
  );
}

function countComponents(total: number, component: AppRouteComponent): number {
  return component.children.reduce(countComponents, total + 1);
}
