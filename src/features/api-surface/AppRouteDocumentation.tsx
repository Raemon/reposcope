import { AppRouteTree } from './AppRouteTree';
import { InsightPanel, InsightSection } from '@/features/surface-ui/InsightSection';
import { InsightTable } from '@/features/surface-ui/InsightTable';
import type { AppRoute, AppRouteComponent } from './appRouteCatalog';

export function AppRouteDocumentation({ routes }: { routes: AppRoute[] }) {
  const componentCount = routes.reduce((total, route) => countComponents(total, route.component), 0);

  return (
    <InsightSection
      id="routes"
      kicker="Rendered from the page tree"
      title="Browser surface"
      blurb="Each URL a person can open, the components it nests, and the API calls those components make."
      stat={`${routes.length} routes · ${componentCount} components`}
    >
      <InsightPanel>
        <InsightTable
          caption="URL routes, their nested components, and the API calls those components make"
          columns={['Component', 'API calls']}
        >
          <AppRouteTree routes={routes} />
        </InsightTable>
      </InsightPanel>
    </InsightSection>
  );
}

function countComponents(total: number, component: AppRouteComponent): number {
  return component.children.reduce(countComponents, total + 1);
}
