import { apiMethodColumns, groupApiEndpoints } from './apiEndpointGroups';
import { ApiEndpointTree } from './ApiEndpointTree';
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
    <section aria-labelledby="api-heading" className="min-w-0">
      <div className="mb-3 max-w-[22rem] border-b border-panel-edge pb-3">
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">{summary}</p>
        <h1 id="api-heading" className="text-xl text-accent">{heading}</h1>
        <p className="mt-1 text-xs leading-5 text-ink-dim">
          URL layers, the code each operation reaches, and the in-repo callers that make it matter to a person.
        </p>
        <p className="mt-2 font-mono text-[11px] text-ink-dim">
          {httpCount} HTTP{socketCount > 0 ? ` · ${socketCount} WebSocket` : ''}
        </p>
      </div>
      <div className="w-fit max-w-full overflow-x-auto rounded border border-panel-edge bg-panel">
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
      </div>
    </section>
  );
}
