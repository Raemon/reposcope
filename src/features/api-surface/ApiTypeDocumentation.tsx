import { ApiTypeSections } from './ApiTypeSections';
import type { ApiTypeSection } from './apiTypeSectionTypes';

export function ApiTypeDocumentation({ sections }: { sections: ApiTypeSection[] }) {
  const entries = sections.flatMap((section) => section.entries);
  const reached = entries.filter((entry) => entry.reachedByApi).length;

  return (
    <section aria-labelledby="types-heading" className="min-w-0">
      <div className="mb-3 max-w-[22rem] border-b border-panel-edge pb-3">
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">Declared in this repository</p>
        <h2 id="types-heading" className="text-xl text-accent">Vocabulary</h2>
        <p className="mt-1 text-xs leading-5 text-ink-dim">
          Every type this codebase invents: first what mutations hand back, then each owning feature in the order the server boundary needs it.
        </p>
        <p className="mt-2 font-mono text-[11px] text-ink-dim">
          {reached} on the API path · {entries.length} total · {sections.length} sections
        </p>
      </div>
      <div className="w-fit max-w-full overflow-x-auto rounded border border-panel-edge bg-panel">
        <table className="table-auto border-collapse">
          <caption className="sr-only">Types and interfaces declared in this codebase</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Kind</th>
              <th scope="col">Name</th>
            </tr>
          </thead>
          <tbody>
            <ApiTypeSections sections={sections} />
          </tbody>
        </table>
      </div>
    </section>
  );
}
