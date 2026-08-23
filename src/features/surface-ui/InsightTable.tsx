import type { ReactNode } from 'react';

export function InsightTable({
  caption,
  columns,
  colgroup = false,
  children,
}: {
  caption: string;
  columns: string[];
  colgroup?: boolean;
  children: ReactNode;
}) {
  return (
    <table className="table-auto border-collapse">
      <caption className="sr-only">{caption}</caption>
      {colgroup ? (
        <colgroup>
          {columns.map((column) => <col key={column} />)}
        </colgroup>
      ) : null}
      <thead className="sr-only">
        <tr>
          {columns.map((column) => <th key={column} scope="col">{column}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
