import { useEffect, useState, useMemo } from 'react';
import api from '../../api/axios';
import DataTable from '../../components/DataTable';

const roleColors = {
  ADMIN: 'bg-purple-100 text-purple-800',
  GESTIONNAIRE: 'bg-blue-100 text-blue-800',
  COMMERCIAL: 'bg-emerald-100 text-emerald-800',
  COMPTABLE: 'bg-orange-100 text-orange-800',
};

export default function DashboardAdmin() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    api.get('/users')
      .then((r) => setUtilisateurs(r.data.utilisateurs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleStatut = async (id, etat) => {
    try {
      await api.patch(`/users/${id}/toggle-status`);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const cols = useMemo(() => [
    { header: 'Nom', accessorFn: (u) => `${u.nom} ${u.prenom}` },
    { header: 'Email', accessorKey: 'email' },
    {
      header: 'Rôle',
      accessorKey: 'role',
      cell: ({ getValue }) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleColors[getValue()] || 'bg-gray-100 text-gray-700'}`}>
          {getValue()}
        </span>
      ),
    },
    {
      header: 'Statut',
      accessorKey: 'etat',
      cell: ({ getValue }) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getValue() === 'ACTIF' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {getValue()}
        </span>
      ),
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <button
          onClick={() => toggleStatut(row.original._id || row.original.id, row.original.etat)}
          className="text-xs text-gray-500 hover:text-gray-800 underline"
        >
          {row.original.etat === 'ACTIF' ? 'Désactiver' : 'Activer'}
        </button>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestion Utilisateurs</h1>
        <button
          onClick={() => alert('Formulaire création utilisateur — à implémenter')}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          + Créer utilisateur
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <DataTable columns={cols} data={utilisateurs} loading={loading} />
      </div>
    </div>
  );
}
