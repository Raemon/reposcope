import type { ApiEndpoint } from '@/features/api-surface/apiEndpointTypes';
import type { ApiTypeSection } from '@/features/api-surface/apiTypeSectionTypes';
import type { AppRoute } from '@/features/api-surface/appRouteCatalog';

export interface RepoSurfacePayload {
  heading: string;
  read: string;
  endpoints: ApiEndpoint[];
  typeSections: ApiTypeSection[];
  routes: AppRoute[];
}
