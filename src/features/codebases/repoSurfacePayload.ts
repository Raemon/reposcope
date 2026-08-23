import type { ApiEndpoint } from '@/features/api-surface/apiEndpointTypes';
import type { ApiTypeSection } from '@/features/api-surface/apiTypeSectionCatalog';
import type { AppRoute } from '@/features/api-surface/appRouteCatalog';
import type { RepoInsights } from '@/features/repo-insights/insightTypes';

export interface RepoSurfacePayload {
  read: string;
  endpoints: ApiEndpoint[];
  typeSections: ApiTypeSection[];
  routes: AppRoute[];
  insights: RepoInsights;
}
