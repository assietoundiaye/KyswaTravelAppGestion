import { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import DataTable from '../../components/DataTable';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function DashboardComptable() {
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

  // Agréger tous les paiements depuis réservations + billets
  const allPaiements = useMemo(() => {
    const fromResa = reservations.flatMap((r) =>
      (r.paiements || []).map((p) => ({
        ...p,
        entite: `Résa #${r.idReservation}`,
        montantNum: p.montant ? parseFloat(p.montant.toString()) : 0,
      }))
    );
    const fromBillets = billets.flatMap((b) =>
      (b.paiements || []).map((p) => ({
        ...p,
        entite: `Billet ${b.numeroBillet}`,
        montantNum: p.montant ? parseFloat(p.montant.toString()) : 0,
      }))
    );
    return [...fromResa, ...fromBillets].sort((a, b) => new Date(b.dateReglement) - new Date(a.dateReglement));
  }, [reservations, billets]);

  const now = new Date();
  const totalCeMois = allPaiements
    .filter((p) => {
      const d = new Date(p.dateReglement);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, p) => s + p.montantNum, 0);

  const resteGlobal =
    reservations.reduce((s, r) => s + (r.resteAPayer || 0), 0) +
    billets.reduce((s, b) => s + (b.resteAPayer || 0), 0);

  const cols = useMemo(() => [
    { header: 'Date', accessorFn: (p) => fmtDate(p.dateReglement) },
    { header: 'Mode', accessorKey: 'mode' },
    { header: 'Référence', accessorFn: (p) => p.reference || '-' },
    { header: 'Entité', accessorKey: 'entite' },
    {
      header: 'Montant',
      accessorKey: 'montantNum',
      cell: ({ getValue }) => <span className="font-medium text-green-700">{fmt(getValue())}</span>,
    },
  ], []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Comptable</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Total payé ce mois" value={fmt(totalCeMois)} color="text-green-600" />
        <StatCard label="Reste à payer global" value={fmt(resteGlobal)} color="text-red-600" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Paiements récents</h2>
        <DataTable columns={cols} data={allPaiements.slice(0, 20)} loading={loading} />
      </div>
    </div>
  );
}
