import { ApiTypeSections } from './ApiTypeSections';
import { InsightPanel, InsightSection } from '@/features/surface-ui/InsightSection';
import { InsightTable } from '@/features/surface-ui/InsightTable';
import type { ApiTypeSection } from './apiTypeSectionCatalog';

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
        <InsightTable caption="Types and interfaces declared in this codebase" columns={['Kind', 'Name']}>
          <ApiTypeSections sections={sections} />
        </InsightTable>
      </InsightPanel>
    </InsightSection>
  );
}
