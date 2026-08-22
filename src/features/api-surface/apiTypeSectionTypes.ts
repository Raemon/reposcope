import type { ApiTypeEntry } from './apiTypeCatalog';

export interface ApiTypeReturn {
  method: string;
  path: string;
  status: number;
  through: string;
}

export interface ApiTypeSectionEntry extends ApiTypeEntry {
  returnedBy: ApiTypeReturn[];
}

export interface ApiTypeSection {
  id: string;
  title: string;
  entries: ApiTypeSectionEntry[];
}

export const RETURNED_SECTION_ID = 'returned-by-post-and-put';
