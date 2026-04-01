import { useEffect, useState, useMemo } from 'react';
import api from '../../../api/axios';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

export default function BilletsPage() {
  const [billets, setBillets] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ numeroBillet: '', compagnie: '', classe: '', destination: '', typeBillet: 'aller_simple', dateDepart: '', dateArrivee: '', prix: '', clientId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([api.get('/billets'), api.get('/clients')]);
      setBillets(b.data.billets || []);
      setClients(c.data.clients || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/billets', { ...form, prix: Number(form.prix) });
      setShowForm(false);
      setForm({ numeroBillet: '', compagnie: '', classe: '', destination: '', typeBillet: 'aller_simple', dateDepart: '', dateArrivee: '', prix: '', clientId: '' });
      fetchAll();
      toast('Billet créé avec succès');
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleAnnuler = async (id) => {
    try { await api.delete(`/billets/${id}`); fetchAll(); toast('Billet annulé'); setConfirmId(null); }
    catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
  };

  const cols = useMemo(() => [
    { header: 'N° Billet', accessorKey: 'numeroBillet' },
    { header: 'Client', accessorFn: (b) => b.clientId ? `${b.clientId.nom} ${b.clientId.prenom}` : '-' },
    { header: 'Compagnie', accessorKey: 'compagnie' },
    { header: 'Destination', accessorKey: 'destination' },
    { header: 'Départ', accessorFn: (b) => fmtDate(b.dateDepart) },
    { header: 'Prix', accessorFn: (b) => fmt(b.prix) },
    {
      header: 'Reste', accessorKey: 'resteAPayer',
      cell: ({ getValue }) => <span className={getValue() > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{fmt(getValue())}</span>
    },
    {
      header: 'Statut', accessorKey: 'statut',
      cell: ({ getValue }) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getValue() === 'ANNULE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{getValue()}</span>
    },
    {
      header: 'Actions', id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <a href={`/api/factures/billet/${row.original._id}`} target="_blank" rel="noreferrer"
            className="text-xs text-blue-600 hover:underline">Facture</a>
          {row.original.statut !== 'ANNULE' && (
            <button onClick={() => setConfirmId(row.original._id)}
              className="text-xs text-red-500 hover:underline">Annuler</button>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Billets</h1>
        <button onClick={() => setShowForm(true)}
          className="btn-primary">
          + Nouveau billet
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Nouveau billet</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[['numeroBillet','N° Billet *'],['compagnie','Compagnie *'],['classe','Classe *'],['destination','Destination *']].map(([k,l]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                  className="premium-input" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select value={form.typeBillet} onChange={e => setForm(f => ({...f, typeBillet: e.target.value}))}
                className="premium-input">
                <option value="aller_simple">Aller simple</option>
                <option value="aller_retour">Aller retour</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prix (FCFA) *</label>
              <input type="number" min="0" value={form.prix} onChange={e => setForm(f => ({...f, prix: e.target.value}))}
                className="premium-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date départ *</label>
              <input type="datetime-local" value={form.dateDepart} onChange={e => setForm(f => ({...f, dateDepart: e.target.value}))}
                className="premium-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date arrivée *</label>
              <input type="datetime-local" value={form.dateArrivee} onChange={e => setForm(f => ({...f, dateArrivee: e.target.value}))}
                className="premium-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Client *</label>
              <select value={form.clientId} onChange={e => setForm(f => ({...f, clientId: e.target.value}))}
                className="premium-input">
                <option value="">Sélectionner un client...</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.nom} {c.prenom} — {c.numeroPasseport}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
              {saving ? 'Enregistrement...' : 'Créer le billet'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="btn-secondary">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="premium-card">
        <DataTable columns={cols} data={billets} loading={loading} />
      </div>

      <ConfirmDialog
        open={!!confirmId}
        message="Annuler ce billet ? Cette action est irréversible."
        onConfirm={() => handleAnnuler(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
