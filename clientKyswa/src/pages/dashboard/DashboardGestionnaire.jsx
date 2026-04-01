import { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import DataTable from '../../components/DataTable';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function DashboardGestionnaire() {
  const [packages, setPackages] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/packages'), api.get('/supplements')])
      .then(([p, s]) => {
        setPackages(p.data.packages || []);
        setSupplements(s.data.supplements || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const ouverts = packages.filter((p) => p.statut === 'OUVERT').length;
  const complets = packages.filter((p) => p.statut === 'COMPLET').length;
  const placesRestantes = packages.reduce((s, p) => s + ((p.quotaMax || 0) - (p.placesReservees || 0)), 0);

  const colsPkg = useMemo(() => [
    { header: 'Référence', accessorKey: 'nomReference' },
    { header: 'Type', accessorKey: 'type' },
    {
      header: 'Statut',
      accessorKey: 'statut',
      cell: ({ getValue }) => {
        const colors = { OUVERT: 'bg-green-100 text-green-800', COMPLET: 'bg-red-100 text-red-800', ANNULE: 'bg-gray-100 text-gray-600', TERMINE: 'bg-blue-100 text-blue-800' };
        return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[getValue()] || ''}`}>{getValue()}</span>;
      },
    },
    { header: 'Départ', accessorFn: (p) => fmtDate(p.dateDepart) },
    { header: 'Quota', accessorKey: 'quotaMax' },
    { header: 'Réservés', accessorKey: 'placesReservees' },
    { header: 'Restants', accessorFn: (p) => (p.quotaMax || 0) - (p.placesReservees || 0) },
  ], []);

  const colsSupp = useMemo(() => [
    { header: 'Nom', accessorKey: 'nom' },
    { header: 'Prix', accessorFn: (s) => s.prix ? Number(s.prix).toLocaleString('fr-FR') + ' FCFA' : '-' },
  ], []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Gestionnaire</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Packages ouverts" value={ouverts} colorClass="grad-card-green" icon="📦" />
        <StatCard label="Packages complets" value={complets} colorClass="grad-card-rose" icon="🔒" />
        <StatCard label="Places restantes" value={placesRestantes} colorClass="grad-card-blue" icon="💺" />
      </div>

      <div className="premium-card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Packages</h2>
        <DataTable columns={colsPkg} data={packages} loading={loading} />
      </div>

      <div className="premium-card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Suppléments</h2>
        <DataTable columns={colsSupp} data={supplements} loading={loading} />
      </div>
    </div>
  );
}
