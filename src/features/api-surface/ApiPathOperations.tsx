'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ApiCallTreeTrigger, type ApiCallTreeRoot } from './ApiCallTreeTooltip';
import { locationTarget } from '@/features/repo-insights/sourceTarget';
import type { ApiEndpoint } from './apiEndpointTypes';

export function ApiPathOperations({
  endpoints,
  methods,
  label,
  reveal,
}: {
  endpoints: ApiEndpoint[];
  methods: string[];
  label: ReactNode;
  reveal: string | null;
}) {
  const row = useRef<HTMLTableRowElement>(null);
  const revealed = endpoints.some((endpoint) => locationTarget(endpoint.code) === reveal);

  useEffect(() => {
    if (revealed) row.current?.scrollIntoView({ block: 'center' });
  }, [reveal]);

  return (
    <tr
      ref={row}
      data-reveal={revealed ? 'true' : undefined}
      className={`border-b border-panel-edge/70 last:border-b-0 ${revealed ? 'bg-procgen ring-1 ring-inset ring-accent' : 'bg-btn/18'}`}
    >
      <th scope="row" className="h-7 whitespace-nowrap py-0 pl-2 pr-2.5 text-left font-normal">{label}</th>
      {methods.map((method, index) => {
        const endpoint = endpoints.find((candidate) => candidate.method === method);
        const spacing = index === 0 ? 'pl-2.5 pr-1' : 'px-1';
        return (
          <td key={method} className={`h-7 whitespace-nowrap py-0 text-left align-middle ${spacing}`}>
            {endpoint ? (
              <ApiCallTreeTrigger
                label={`${endpoint.method} ${endpoint.path}`}
                roots={[callTreeRoot(endpoint)]}
              >
                <span className="flex h-5 items-center text-[9px] tracking-[0.08em] text-ink opacity-50">
                  {method}
                </span>
              </ApiCallTreeTrigger>
            ) : (
              <span aria-hidden="true" className="flex h-5 items-center text-[9px] tracking-[0.08em] text-ink opacity-[0.1]">
                {method}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

export function callTreeRoot(endpoint: ApiEndpoint): ApiCallTreeRoot {
  return {
    label: endpoint.method,
    step: endpoint.code,
    consumers: endpoint.consumers,
    signature: endpoint.signature,
  };
}
