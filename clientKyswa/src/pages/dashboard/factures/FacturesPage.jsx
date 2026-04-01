import { useEffect, useState, useMemo } from 'react';
import api from '../../../api/axios';
import DataTable from '../../../components/DataTable';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function FacturesPage() {
  const [reservations, setReservations] = useState([]);
  const [billets, setBillets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('reservations');

  useEffect(() => {
    Promise.all([api.get('/reservations'), api.get('/billets')])
      .then(([r, b]) => { setReservations(r.data.reservations || []); setBillets(b.data.billets || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const colsResa = useMemo(() => [
    { header: 'N°', accessorKey: 'idReservation' },
    { header: 'Client(s)', accessorFn: (r) => r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ') || '-' },
    { header: 'Départ', accessorFn: (r) => fmtDate(r.dateDepart) },
    { header: 'Total dû', accessorFn: (r) => fmt(r.montantTotalDu) },
    {
      header: 'Reste', accessorKey: 'resteAPayer',
      cell: ({ getValue }) => <span className={getValue() > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{fmt(getValue())}</span>
    },
    {
      header: 'Factures', id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <a href={`/api/factures/reservation/${row.original._id}?type=acompte`} target="_blank" rel="noreferrer"
            className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold hover:bg-blue-200">
            Acompte
          </a>
          <a href={`/api/factures/reservation/${row.original._id}?type=solde`} target="_blank" rel="noreferrer"
            className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-semibold hover:bg-green-200">
            Solde
          </a>
        </div>
      ),
    },
  ], []);

  const colsBillets = useMemo(() => [
    { header: 'N° Billet', accessorKey: 'numeroBillet' },
    { header: 'Client', accessorFn: (b) => b.clientId ? `${b.clientId.nom} ${b.clientId.prenom}` : '-' },
    { header: 'Destination', accessorKey: 'destination' },
    { header: 'Départ', accessorFn: (b) => fmtDate(b.dateDepart) },
    { header: 'Prix', accessorFn: (b) => fmt(b.prix) },
    {
      header: 'Reste', accessorKey: 'resteAPayer',
      cell: ({ getValue }) => <span className={getValue() > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{fmt(getValue())}</span>
    },
    {
      header: 'Facture', id: 'actions',
      cell: ({ row }) => (
        <a href={`/api/factures/billet/${row.original._id}`} target="_blank" rel="noreferrer"
          className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold hover:bg-primary/20">
          Télécharger PDF
        </a>
      ),
    },
  ], []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Factures</h1>

      <div className="flex gap-2 border-b border-gray-200">
        {['reservations', 'billets'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'reservations' ? 'Réservations' : 'Billets'}
          </button>
        ))}
      </div>

      <div className="premium-card">
        {tab === 'reservations' ? (
          <DataTable columns={colsResa} data={reservations} loading={loading} />
        ) : (
          <DataTable columns={colsBillets} data={billets} loading={loading} />
        )}
      </div>
    </div>
  );
}
