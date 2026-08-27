import { useEffect, useState, useMemo } from 'react';
import { Calendar as CalendarIcon, BarChart2, DollarSign, CornerDownLeft, Search } from 'lucide-react';
import api from '../../../core/api/axios';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionsContext';
import { toast } from '../../../components/Toast';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function DesistementsPage() {
  const { role } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const hasCreate = canCreate('desistements') || ['dg', 'administrateur', 'informatique', 'comptable'].includes((role || '').toLowerCase());
  const hasEdit = canEdit('desistements') || ['dg', 'administrateur', 'informatique', 'comptable'].includes((role || '').toLowerCase());
  const hasDelete = canDelete('desistements') || ['dg', 'administrateur', 'informatique'].includes((role || '').toLowerCase());
  const [desistements, setDesistements] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reservationId: '', clientId: '', motif: '', dateDepart: '' });
  const [clientsResa, setClientsResa] = useState([]);
  const [resaSelectionnee, setResaSelectionnee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editDesistement, setEditDesistement] = useState(null);
  const [editDateDepart, setEditDateDepart] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [search, setSearch] = useState('');

  const desistementsFiltres = useMemo(() => {
    if (!search.trim()) return desistements;
    const q = search.toLowerCase();
    return desistements.filter(d =>
      `${d.clientId?.nom || ''} ${d.clientId?.prenom || ''}`.toLowerCase().includes(q) ||
      (d.reservationId?.numero || d.reservationId?.idReservation || '').toLowerCase().includes(q) ||
      (d.motif || '').toLowerCase().includes(q)
    );
  }, [desistements, search]);

  const handleDelete = async () => {
    try {
      await api.delete(`/desistements/${confirmDeleteId}`);
      toast('Désistement supprimé — la réservation a été remise en INSCRIT');
      setConfirmDeleteId(null);
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    }
  };

  const handleEditDateDepart = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const res = await api.patch(`/desistements/${editDesistement._id}`, { dateDepart: editDateDepart });
      toast(`Date corrigée — Nouveau taux : ${res.data.tauxRemboursement}% = ${fmt(res.data.montantRembourse)}`);
      setEditDesistement(null);
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setEditSaving(false); }
  };

  const downloadRecu = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/desistements/${id}/recu`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast('Erreur génération reçu', 'error'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `recu-desistement-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast('Erreur téléchargement', 'error'); }
  };

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
    const resa = reservations.find(r => r._id === reservationId);
    setResaSelectionnee(resa || null);
    setClientsResa(resa?.clients || []);
    // Prendre la date de départ du package en priorité, sinon celle de la réservation
    const dateDepartSource = resa?.packageKId?.dateDepart || resa?.dateDepart;
    const dateDepart = dateDepartSource ? new Date(dateDepartSource).toISOString().split('T')[0] : '';
    setForm(f => ({ ...f, reservationId, clientId: '', dateDepart }));
  };

  // Simulation du taux en temps réel
  const simulation = useMemo(() => {
    if (!form.dateDepart) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const depart = new Date(form.dateDepart);
    depart.setHours(0, 0, 0, 0);
    const jours = Math.max(0, Math.floor((depart - today) / (1000 * 60 * 60 * 24)));
    let taux = 0;
    if (jours >= 60) taux = 100;
    else if (jours >= 30) taux = 80;
    else if (jours >= 15) taux = 50;
    else if (jours > 0) taux = 25;
    return { jours, taux };
  }, [form.dateDepart]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        reservationId: form.reservationId,
        clientId: form.clientId,
        motif: form.motif,
        // Envoyer la date de départ corrigée si différente
        ...(form.dateDepart ? { dateDepart: form.dateDepart } : {}),
      };
      const res = await api.post('/desistements', payload);
      toast(`Désistement créé — Remboursement : ${res.data.tauxRemboursement}% = ${fmt(res.data.montantRembourse)}`);
      setShowForm(false);
      setForm({ reservationId: '', clientId: '', motif: '', dateDepart: '' });
      setResaSelectionnee(null);
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
    { header: 'Date départ', accessorFn: (d) => fmtDate(d.dateDepart) },
    { header: 'Jours avant départ', accessorKey: 'joursAvantDepart' },
    { header: 'Taux remb.', accessorFn: (d) => `${d.tauxRemboursement}%` },
    { header: 'Montant payé', accessorFn: (d) => fmt(d.montantPaye) },
    { header: 'À rembourser', accessorFn: (d) => fmt(d.montantRembourse), cell: ({ getValue }) => <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{getValue()}</span> },
    {
      header: 'Statut', accessorKey: 'statut',
      cell: ({ getValue }) => {
        const val = getValue() || '';
        const isRemb = val.toLowerCase().includes('rembours') || val === 'REMBOURSE';
        const isAttente = val.toLowerCase().includes('attente') || val === 'EN_ATTENTE';
        return (
          <span className={`badge ${isRemb ? 'badge-success' : isAttente ? 'badge-warning' : 'badge-neutral'}`}>
            {val}
          </span>
        );
      }
    },
    {
      header: 'Actions', id: 'actions',
      cell: ({ row }) => {
        const isAttente = (row.original.statut || '').toLowerCase().includes('attente') || row.original.statut === 'EN_ATTENTE';
        return (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {isAttente && hasEdit && (
            <button onClick={() => handleRembourser(row.original._id)} className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}>
              Marquer remboursé
            </button>
          )}
          {isAttente && hasEdit && (
            <button
              onClick={() => {
                setEditDesistement(row.original);
                setEditDateDepart(row.original.dateDepart ? new Date(row.original.dateDepart).toISOString().split('T')[0] : '');
              }}
              style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: 6, padding: '4px 10px', color: '#D97706', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Corriger date
            </button>
          )}
          <button onClick={() => downloadRecu(row.original._id)}
            style={{ background: 'rgba(37,99,235,0.08)', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#2563EB', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            Reçu PDF
          </button>
            {hasDelete && (
            <button onClick={() => setConfirmDeleteId(row.original._id)}
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 10px', color: '#DC2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Supprimer
            </button>
          )}
        </div>
        );
      },
    },
  ], [role, hasEdit, hasDelete]);

  return (
    <div className="animate-fade-in space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
          Désistements
        </h1>
        {hasCreate && <button onClick={() => setShowForm(true)} className="btn-primary">+ Nouveau désistement</button>}
      </div>

      {/* Barre de recherche */}
      <div style={{ position: 'relative', maxWidth: 380 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par client, N° réservation, motif..."
          className="premium-input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      <div className="premium-card">
        <DataTable columns={cols} data={desistementsFiltres} loading={loading} />
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
              <select value={form.clientId} onChange={e => setForm(f => ({...f, clientId: e.target.value}))} className="premium-input" required>
                <option value="">Sélectionner...</option>
                {clientsResa.map(c => (
                  <option key={c._id} value={c._id}>{c.nom} {c.prenom}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date de départ — affichée et modifiable */}
          {form.reservationId && (
            <div>
              <label className="input-label">
                Date de départ *
                {resaSelectionnee?.packageKId?.dateDepart && (
                  <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 400, marginLeft: 8 }}>
                    (depuis le package : {new Date(resaSelectionnee.packageKId.dateDepart).toLocaleDateString('fr-FR')})
                  </span>
                )}
              </label>
              <input
                type="date"
                value={form.dateDepart}
                onChange={e => setForm(f => ({ ...f, dateDepart: e.target.value }))}
                className="premium-input"
                required
              />
            </div>
          )}

          {/* Simulation du taux en temps réel */}
          {simulation !== null && (
            <div style={{
              borderRadius: 10, padding: '12px 16px',
              background: simulation.taux === 0 ? '#FEF2F2' : simulation.taux === 100 ? '#F0FDF4' : '#FFFBEB',
              border: `1px solid ${simulation.taux === 0 ? 'rgba(220,38,38,0.2)' : simulation.taux === 100 ? 'rgba(22,163,74,0.2)' : 'rgba(217,119,6,0.2)'}`,
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: simulation.taux === 0 ? '#DC2626' : simulation.taux === 100 ? '#16A34A' : '#D97706' }}>
                Simulation du remboursement
              </p>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarIcon size={13} color="#6B7280" /> <strong>{simulation.jours} jour(s)</strong> avant le départ</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BarChart2 size={13} color="#6B7280" /> Taux : <strong>{simulation.taux}%</strong></span>
                {resaSelectionnee && (() => {
                  const totalPaye = (resaSelectionnee.paiements || []).reduce((s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0), 0);
                  const nbClients = resaSelectionnee.clients?.length || 1;
                  const partClient = Math.round(totalPaye / nbClients);
                  const rembourse = Math.round(partClient * simulation.taux / 100);
                  return (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={13} color="#6B7280" /> Part client : <strong>{fmt(partClient)}</strong></span>
                      <span style={{ color: simulation.taux === 0 ? '#DC2626' : '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CornerDownLeft size={13} /> À rembourser : <strong>{fmt(rembourse)}</strong>
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <div>
            <label className="input-label">Motif</label>
            <textarea value={form.motif} onChange={e => setForm(f => ({...f, motif: e.target.value}))}
              className="premium-input" rows={2} placeholder="Raison du désistement..." />
          </div>

          {/* Grille de remboursement */}
          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, fontSize: 11, textTransform: 'uppercase' }}>Grille de remboursement</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['≥ 60j', '100%', '#16A34A'], ['30-59j', '80%', '#2563EB'], ['15-29j', '50%', '#D97706'], ['1-14j', '25%', '#EA580C'], ['0j', '0%', '#DC2626']].map(([jours, taux, color]) => (
                <span key={jours} style={{ background: `${color}12`, color, borderRadius: 6, padding: '3px 8px', fontWeight: 700, fontSize: 11 }}>
                  {jours} → {taux}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Création...' : 'Créer le désistement'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Supprimer ce désistement ? La réservation sera remise au statut INSCRIT."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Modal correction date de départ */}
      <Modal open={!!editDesistement} onClose={() => setEditDesistement(null)} title="Corriger la date de départ">
        <form onSubmit={handleEditDateDepart} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Le taux de remboursement sera recalculé automatiquement selon la nouvelle date de départ.
          </p>
          {editDesistement && (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const depart = editDateDepart ? new Date(editDateDepart) : null;
            const jours = depart ? Math.max(0, Math.floor((depart - today) / (1000 * 60 * 60 * 24))) : null;
            let taux = 0;
            if (jours !== null) {
              if (jours >= 60) taux = 100;
              else if (jours >= 30) taux = 80;
              else if (jours >= 15) taux = 50;
              else if (jours > 0) taux = 25;
            }
            return jours !== null ? (
              <div style={{ background: taux === 0 ? '#FEF2F2' : '#F0FDF4', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                <strong>{jours} jour(s)</strong> avant le départ → Taux : <strong style={{ color: taux === 0 ? '#DC2626' : '#16A34A' }}>{taux}%</strong>
                {' '}→ À rembourser : <strong style={{ color: taux === 0 ? '#DC2626' : '#16A34A' }}>{fmt(Math.round((editDesistement.montantPaye || 0) * taux / 100))}</strong>
              </div>
            ) : null;
          })()}
          <div>
            <label className="input-label">Nouvelle date de départ *</label>
            <input
              type="date"
              value={editDateDepart}
              onChange={e => setEditDateDepart(e.target.value)}
              className="premium-input"
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditDesistement(null)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={editSaving} className="btn-primary">
              {editSaving ? 'Correction...' : 'Recalculer et sauvegarder'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
