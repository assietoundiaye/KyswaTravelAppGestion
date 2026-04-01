import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

export default function DataTable({ columns, data, loading }) {
  const table = useReactTable({ data: data || [], columns, getCoreRowModel: getCoreRowModel() });

  if (loading) return (
    <div style={{ padding: '32px 0', textAlign: 'center' }}>
      <div className="skeleton" style={{ height: 16, width: '60%', margin: '0 auto 12px' }} />
      <div className="skeleton" style={{ height: 16, width: '40%', margin: '0 auto' }} />
    </div>
  );

  if (!data?.length) return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
      Aucune donnée disponible
    </div>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="premium-table">
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
