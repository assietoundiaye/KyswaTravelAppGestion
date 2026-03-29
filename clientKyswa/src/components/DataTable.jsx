import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';

export default function DataTable({ columns, data, loading }) {
  const table = useReactTable({ data: data || [], columns, getCoreRowModel: getCoreRowModel() });

  if (loading) return <p className="text-sm text-gray-500 py-4">Chargement...</p>;
  if (!data?.length) return <p className="text-sm text-gray-400 py-4">Aucune donnée</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b text-left text-xs text-gray-500 uppercase tracking-wide">
              {hg.headers.map((h) => (
                <th key={h.id} className="pb-2 pr-4 font-medium">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-2.5 pr-4 text-gray-700">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
