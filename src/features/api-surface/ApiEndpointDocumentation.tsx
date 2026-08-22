import { apiMethodColumns, groupApiEndpoints } from './apiEndpointGroups';
import { ApiEndpointTree } from './ApiEndpointTree';
import { InsightPanel, InsightSection } from '@/features/repo-insights/ui/InsightSection';
import type { ApiEndpoint } from './apiEndpointTypes';

export function ApiEndpointDocumentation({
  endpoints,
  heading,
  summary,
}: {
  endpoints: ApiEndpoint[];
  heading: string;
  summary: string;
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
        <table className="table-auto border-collapse">
          <caption className="sr-only">API endpoints grouped by URL layer</caption>
          <colgroup>
            <col />
            {methods.map((method) => <col key={method} />)}
          </colgroup>
          <thead className="sr-only">
            <tr>
              <th scope="col">Path</th>
              {methods.map((method) => <th key={method} scope="col">{method}</th>)}
            </tr>
          </thead>
          <tbody>
            <ApiEndpointTree groups={groups} methods={methods} />
          </tbody>
        </table>
      </InsightPanel>
    </InsightSection>
  );
}
