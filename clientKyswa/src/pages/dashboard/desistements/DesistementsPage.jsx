import { useEffect, useState, useMemo } from 'react';
import api from '../../../api/axios';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function DesistementsPage() {
  const { role } = useAuth();
  const [desistements, setDesistements] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reservationId: '', clientId: '', motif: '' });
  const [clientsResa, setClientsResa] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        api.get('/desistements'),
        api.get('/reservations'),
      ]);
      setDesistements(d.data.desistements || []);
      setReservations((r.data.reservations || []).filter(r => !['ANNULEE', 'DESISTE'].includes(r.statut)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const onResaChange = (reservationId) => {
    setForm(f => ({ ...f, reservationId, clientId: '' }));
    const resa = reservations.find(r => r._id === reservationId);
    setClientsResa(resa?.clients || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/desistements', form);
      toast(`Désistement créé — Remboursement : ${res.data.tauxRemboursement}% = ${fmt(res.data.montantRembourse)}`);
      setShowForm(false);
      setForm({ reservationId: '', clientId: '', motif: '' });
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleRembourser = async (id) => {
    try {
      await api.patch(`/desistements/${id}/rembourser`);
      toast('Remboursement enregistré');
      fetchAll();
    } catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
  };

  const cols = useMemo(() => [
    { header: 'Client', accessorFn: (d) => d.clientId ? `${d.clientId.nom} ${d.clientId.prenom}` : '-' },
    { header: 'Réservation', accessorFn: (d) => d.reservationId?.numero || d.reservationId?.idReservation || '-' },
    { header: 'Date annulation', accessorFn: (d) => fmtDate(d.dateAnnulation) },
    { header: 'Jours avant départ', accessorKey: 'joursAvantDepart' },
    { header: 'Taux remb.', accessorFn: (d) => `${d.tauxRemboursement}%` },
    { header: 'Montant payé', accessorFn: (d) => fmt(d.montantPaye) },
    { header: 'À rembourser', accessorFn: (d) => fmt(d.montantRembourse), cell: ({ getValue }) => <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{getValue()}</span> },
    {
      header: 'Statut', accessorKey: 'statut',
      cell: ({ getValue }) => <span className={`badge ${getValue() === 'REMBOURSE' ? 'badge-success' : getValue() === 'EN_ATTENTE' ? 'badge-warning' : 'badge-neutral'}`}>{getValue()}</span>
    },
    {
      header: 'Actions', id: 'actions',
      cell: ({ row }) => (
        row.original.statut === 'EN_ATTENTE' && ['COMPTABLE', 'ADMIN'].includes(role) ? (
          <button onClick={() => handleRembourser(row.original._id)} className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}>
            Marquer remboursé
          </button>
        ) : null
      ),
    },
  ], [role]);

  return (
    <div className="animate-fade-in space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
          Désistements
        </h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nouveau désistement</button>
      </div>

      <div className="premium-card">
        <DataTable columns={cols} data={desistements} loading={loading} />
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouveau désistement">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="input-label">Réservation *</label>
            <select value={form.reservationId} onChange={e => onResaChange(e.target.value)} className="premium-input">
              <option value="">Sélectionner...</option>
              {reservations.map(r => (
                <option key={r._id} value={r._id}>
                  {r.numero || r.idReservation} — {r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ')}
                </option>
              ))}
            </select>
          </div>
          {clientsResa.length > 0 && (
            <div>
              <label className="input-label">Client *</label>
              <select value={form.clientId} onChange={e => setForm(f => ({...f, clientId: e.target.value}))} className="premium-input">
                <option value="">Sélectionner...</option>
                {clientsResa.map(c => (
                  <option key={c._id} value={c._id}>{c.nom} {c.prenom}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="input-label">Motif</label>
            <textarea value={form.motif} onChange={e => setForm(f => ({...f, motif: e.target.value}))}
              className="premium-input" rows={3} />
          </div>
          <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 13, color: 'var(--warning)' }}>
            ⚠️ Le remboursement sera calculé automatiquement selon la grille : 90j+ = 100%, 60j = 75%, 30j = 50%, 15j = 25%, 0j = 0%
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Création...' : 'Créer le désistement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
