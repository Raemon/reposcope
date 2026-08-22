import { ApiTypeSections } from './ApiTypeSections';
import { InsightPanel, InsightSection } from '@/features/repo-insights/ui/InsightSection';
import type { ApiTypeSection } from './apiTypeSectionTypes';

export function ApiTypeDocumentation({ sections }: { sections: ApiTypeSection[] }) {
  const entries = sections.flatMap((section) => section.entries);
  const reached = entries.filter((entry) => entry.reachedByApi).length;

  return (
    <InsightSection
      id="types"
      kicker="Declared in this repository"
      title="Vocabulary"
      blurb="Every type this codebase invents: first what mutations hand back, then each owning feature in the order the server boundary needs it."
      stat={`${reached} on the API path · ${entries.length} total · ${sections.length} sections`}
    >
      <InsightPanel>
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
      </InsightPanel>
    </InsightSection>
  );
}
