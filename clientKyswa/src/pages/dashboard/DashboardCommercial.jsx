import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import DataTable from '../../components/DataTable';

const statutBadge = {
  EN_ATTENTE: 'bg-yellow-100 text-yellow-800',
  CONFIRMEE: 'bg-blue-100 text-blue-800',
  PAYEE: 'bg-green-100 text-green-800',
  ANNULEE: 'bg-red-100 text-red-800',
};

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function DashboardCommercial() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [billets, setBillets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/reservations'), api.get('/billets')])
      .then(([r, b]) => {
        setReservations(r.data.reservations || []);
        setBillets(b.data.billets || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const enCours = reservations.filter((r) => r.statut === 'EN_ATTENTE' || r.statut === 'CONFIRMEE').length;
  const resteTotal = reservations.reduce((s, r) => s + (r.resteAPayer || 0), 0);

  const colsResa = useMemo(() => [
    { header: 'N°', accessorKey: 'idReservation' },
    {
      header: 'Client(s)',
      accessorFn: (r) => r.clients?.map((c) => `${c.nom} ${c.prenom}`).join(', ') || '-',
    },
    {
      header: 'Statut',
      accessorKey: 'statut',
      cell: ({ getValue }) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statutBadge[getValue()] || 'bg-gray-100 text-gray-700'}`}>
          {getValue()}
        </span>
      ),
    },
    {
      header: 'Reste',
      accessorKey: 'resteAPayer',
      cell: ({ getValue }) => (
        <span className={getValue() > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
          {fmt(getValue())}
        </span>
      ),
    },
    { header: 'Départ', accessorFn: (r) => fmtDate(r.dateDepart) },
  ], []);

  const colsBillets = useMemo(() => [
    { header: 'N° Billet', accessorKey: 'numeroBillet' },
    { header: 'Client', accessorFn: (b) => b.clientId ? `${b.clientId.nom} ${b.clientId.prenom}` : '-' },
    { header: 'Destination', accessorKey: 'destination' },
    { header: 'Départ', accessorFn: (b) => fmtDate(b.dateDepart) },
    {
      header: 'Reste',
      accessorKey: 'resteAPayer',
      cell: ({ getValue }) => (
        <span className={getValue() > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
          {fmt(getValue())}
        </span>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Commercial</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Réservations en cours" value={enCours} loading={loading} />
        <StatCard label="Reste à payer total" value={fmt(resteTotal)} color="text-red-600" />
        <StatCard label="Billets" value={billets.length} />
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => navigate('/dashboard/reservations/new')}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
          + Nouvelle réservation
        </button>
        <button onClick={() => navigate('/dashboard/billets/new')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + Nouveau billet
        </button>
        <button onClick={() => navigate('/dashboard/paiements/new')}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          + Ajouter paiement
        </button>
      </div>

      {/* Réservations récentes */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Réservations récentes</h2>
        <DataTable columns={colsResa} data={reservations.slice(0, 10)} loading={loading} />
      </div>

      {/* Billets récents */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Billets récents</h2>
        <DataTable columns={colsBillets} data={billets.slice(0, 10)} loading={loading} />
      </div>
    </div>
  );
}
