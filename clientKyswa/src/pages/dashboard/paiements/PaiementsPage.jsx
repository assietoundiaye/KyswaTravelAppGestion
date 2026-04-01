import { useEffect, useState, useMemo } from 'react';
import api from '../../../api/axios';
import DataTable from '../../../components/DataTable';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

const MODES = ['ESPECES','VIREMENT','CHEQUE','CARTE_BANCAIRE','ORANGE_MONEY','WAVE','MONEY','AUTRE'];
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

export default function PaiementsPage() {
  const [reservations, setReservations] = useState([]);
  const [billets, setBillets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [entiteType, setEntiteType] = useState('reservation');
  const [form, setForm] = useState({ montant: '', dateReglement: new Date().toISOString().split('T')[0], mode: 'ESPECES', reference: '', reservationId: '', billetId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const { role } = useAuth();
  const canDelete = ['comptable', 'COMPTABLE'].includes(role);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([api.get('/reservations'), api.get('/billets')]);
      setReservations(r.data.reservations || []);
      setBillets(b.data.billets || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        montant: Number(form.montant),
        dateReglement: form.dateReglement,
        mode: form.mode,
        reference: form.reference || undefined,
        ...(entiteType === 'reservation' ? { reservationId: form.reservationId } : { billetId: form.billetId }),
      };
      // POST to the entity's paiement endpoint
      if (entiteType === 'reservation') {
        await api.post(`/reservations/${form.reservationId}/paiements`, payload);
      } else {
        await api.post(`/billets/${form.billetId}/paiements`, payload);
      }
      setShowForm(false);
      setForm({ montant: '', dateReglement: '', mode: 'ESPECES', reference: '', reservationId: '', billetId: '' });
      fetchAll();
      toast('Paiement enregistré');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally { setSaving(false); }
  };

  // Agréger tous les paiements
  const allPaiements = useMemo(() => {
    const fromResa = reservations.flatMap(r =>
      (r.paiements || []).map(p => ({
        ...p,
        entite: `${r.numero || `#${r.idReservation}`}${r.packageKId?.nomReference ? ` · ${r.packageKId.nomReference}` : ''}`,
        client: r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ') || '—',
        montantNum: p.montant ? parseFloat(p.montant.toString()) : 0,
      }))
    );
    const fromBillets = billets.flatMap(b =>
      (b.paiements || []).map(p => ({
        ...p,
        entite: `Billet ${b.numeroBillet}`,
        client: `${b.clientId?.nom || ''} ${b.clientId?.prenom || ''}`.trim() || '—',
        montantNum: p.montant ? parseFloat(p.montant.toString()) : 0,
      }))
    );
    return [...fromResa, ...fromBillets].sort((a, b) => new Date(b.dateReglement) - new Date(a.dateReglement));
  }, [reservations, billets]);

  const cols = useMemo(() => [
    { header: 'Date', accessorFn: (p) => fmtDate(p.dateReglement) },
    { header: 'Inscription / Billet', accessorKey: 'entite' },
    { header: 'Client', accessorKey: 'client' },
    { header: 'Mode', accessorKey: 'mode' },
    { header: 'Référence', accessorFn: (p) => p.reference || '—' },
    { header: 'Montant', accessorKey: 'montantNum', cell: ({ getValue }) => <span style={{ fontWeight: 700, color: '#16A34A' }}>{fmt(getValue())}</span> },
    ...(canDelete ? [{
      header: 'Action', id: 'actions',
      cell: ({ row }) => (
        <button onClick={() => setConfirmId(row.original._id)}
          style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Supprimer
        </button>
      ),
    }] : []),
  ], [canDelete]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
        <button onClick={() => setShowForm(true)}
          className="btn-primary">
          + Ajouter paiement
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Nouveau paiement</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value="reservation" checked={entiteType === 'reservation'} onChange={() => setEntiteType('reservation')} />
              Réservation
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value="billet" checked={entiteType === 'billet'} onChange={() => setEntiteType('billet')} />
              Billet
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entiteType === 'reservation' ? (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Réservation *</label>
                <select value={form.reservationId} onChange={e => setForm(f => ({...f, reservationId: e.target.value}))}
                  className="premium-input">
                  <option value="">Sélectionner...</option>
                  {reservations.filter(r => r.statut !== 'ANNULEE' && r.statut !== 'PAYEE' && (r.resteAPayer || 0) > 0).map(r => (
                    <option key={r._id} value={r._id}>
                      {r.numero || `#${r.idReservation}`}
                      {r.packageKId?.nomReference ? ` — ${r.packageKId.nomReference}` : ''}
                      {' — '}{r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ')}
                      {' — Reste: '}{fmt(r.resteAPayer)}
                    </option>
                  ))}
                </select>
                {form.reservationId && (() => {
                  const r = reservations.find(x => x._id === form.reservationId);
                  if (!r) return null;
                  const recu = (r.montantTotalDu || 0) - (r.resteAPayer || 0);
                  return (
                    <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(0,103,79,0.06)', borderRadius: 8, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                      <div><p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Package</p><p style={{ fontSize: 13, fontWeight: 700 }}>{r.packageKId?.nomReference || '—'}</p></div>
                      <div><p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total dû</p><p style={{ fontSize: 13, fontWeight: 700 }}>{fmt(r.montantTotalDu)}</p></div>
                      <div><p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Déjà reçu</p><p style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>{fmt(recu)}</p></div>
                      <div><p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Reste à payer</p><p style={{ fontSize: 13, fontWeight: 800, color: '#DC2626' }}>{fmt(r.resteAPayer)}</p></div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Billet *</label>
                <select value={form.billetId} onChange={e => setForm(f => ({...f, billetId: e.target.value}))}
                  className="premium-input">
                  <option value="">Sélectionner...</option>
                  {billets.filter(b => b.statut !== 'ANNULE').map(b => (
                    <option key={b._id} value={b._id}>{b.numeroBillet} — {b.clientId?.nom} {b.clientId?.prenom} — Reste: {fmt(b.resteAPayer)}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA) *</label>
              <input type="number" min="1" value={form.montant} onChange={e => setForm(f => ({...f, montant: e.target.value}))}
                className="premium-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date règlement *</label>
              <input type="date" value={form.dateReglement} onChange={e => setForm(f => ({...f, dateReglement: e.target.value}))}
                className="premium-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mode *</label>
              <select value={form.mode} onChange={e => setForm(f => ({...f, mode: e.target.value}))}
                className="premium-input">
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Référence</label>
              <input value={form.reference} onChange={e => setForm(f => ({...f, reference: e.target.value}))}
                className="premium-input" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="btn-secondary">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="premium-card">
        <DataTable columns={cols} data={allPaiements} loading={loading} />
      </div>

      <ConfirmDialog
        open={!!confirmId}
        message="Supprimer ce paiement ? Le reste à payer sera recalculé."
        onConfirm={async () => {
          try {
            await api.delete(`/paiements/${confirmId}`);
            toast('Paiement supprimé');
            fetchAll();
          } catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
          finally { setConfirmId(null); }
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
