import type { ReactNode } from 'react';

export function InsightTable({
  caption,
  columns,
  children,
}: {
  caption: string;
  columns: string[];
  children: ReactNode;
}) {
  return (
    <table className="table-auto border-collapse">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          {columns.map((column) => <th key={column} scope="col">{column}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
