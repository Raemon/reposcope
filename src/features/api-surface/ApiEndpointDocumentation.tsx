import { apiMethodColumns, groupApiEndpoints } from './apiEndpointGroups';
import { ApiEndpointTree } from './ApiEndpointTree';
import { InsightPanel, InsightSection } from '@/features/surface-ui/InsightSection';
import { InsightTable } from '@/features/surface-ui/InsightTable';
import type { ApiEndpoint } from './apiEndpointTypes';

export function ApiEndpointDocumentation({
  endpoints,
  heading,
  summary,
  reveal,
}: {
  endpoints: ApiEndpoint[];
  heading: string;
  summary: string;
  reveal: string | null;
}) {
  const groups = groupApiEndpoints(endpoints);
  const methods = apiMethodColumns(endpoints);
  const httpCount = endpoints.filter((endpoint) => endpoint.transport === 'http').length;
  const socketCount = endpoints.length - httpCount;

  return (
    <InsightSection
      id="api"
      kicker={summary}
      title={heading}
      blurb="URL layers, the code each operation reaches, and the in-repo callers that make it matter to a person."
      stat={`${httpCount} HTTP${socketCount > 0 ? ` · ${socketCount} WebSocket` : ''}`}
      as="h1"
    >
      <InsightPanel>
<InsightTable caption="API endpoints grouped by URL layer" columns={['Path', ...methods]} colgroup>
          <ApiEndpointTree groups={groups} methods={methods} reveal={reveal} />
        </InsightTable>
      </InsightPanel>
    </InsightSection>
  );
}
