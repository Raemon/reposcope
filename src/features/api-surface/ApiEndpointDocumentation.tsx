'use client';

import { useContext } from 'react';
import { apiMethodColumns, groupApiEndpoints } from './apiEndpointGroups';
import { ApiEndpointTree } from './ApiEndpointTree';
import { InsightPanel, InsightSection } from '@/features/surface-ui/InsightSection';
import { InsightTable } from '@/features/surface-ui/InsightTable';
import { RepoRefContext } from '@/features/surface-ui/SourceRef';
import type { ApiEndpoint } from './apiEndpointTypes';

export function ApiEndpointDocumentation({
  endpoints,
  reveal,
}: {
  endpoints: ApiEndpoint[];
  reveal: string | null;
}) {
  const held = useContext(RepoRefContext);
  const groups = groupApiEndpoints(endpoints);
  const methods = apiMethodColumns(endpoints);
  const httpCount = endpoints.filter((endpoint) => endpoint.transport === 'http').length;
  const socketCount = endpoints.length - httpCount;

  return (
    <InsightSection
      id="api"
      kicker="Traced from the source"
      title={held ? `${held.owner}/${held.repo}` : ''}
      blurb="URL layers, the code each operation reaches, and the in-repo callers that make it matter to a person."
      stat={`${httpCount} HTTP${socketCount > 0 ? ` · ${socketCount} WebSocket` : ''}`}
      as="h1"
    >
      <InsightPanel>
<InsightTable caption="API endpoints grouped by URL layer" columns={['Path', ...methods]}>
          <ApiEndpointTree groups={groups} methods={methods} reveal={reveal} />
        </InsightTable>
      </InsightPanel>
    </InsightSection>
  );
}
