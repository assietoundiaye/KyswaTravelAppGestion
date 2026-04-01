import { useEffect, useState, useMemo } from 'react';
import api from '../../../api/axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from '../../../components/Toast';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmt = (n) => n ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '—';

const EMPTY = {
  nomReference: '', type: 'OUMRA', statut: 'OUVERT',
  dateDepart: '', dateRetour: '',
  prixSingle: '', prixDouble: '', prixTriple: '', prixQuadruple: '',
  compagnieAerienne: '', numeroVol: '', villeDepart: '', villeArrivee: '',
  hotel: '', quotaMax: '',
};

const STATUT_COLORS = {
  OUVERT: { bg: '#F0FDF4', color: '#16A34A' },
  COMPLET: { bg: '#FEF2F2', color: '#DC2626' },
  ANNULE: { bg: '#F3F4F6', color: '#6B7280' },
  TERMINE: { bg: '#EFF6FF', color: '#2563EB' },
};

export default function PackagesPage() {
  const { role } = useAuth();
  const canEdit = ['dg', 'administrateur'].includes(role);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const fetchPackages = async () => {
    setLoading(true);
    try { const r = await api.get('/packages'); setPackages(r.data.packages || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPackages(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openEdit = (pkg) => {
    setEditId(pkg._id);
    setForm({
      nomReference: pkg.nomReference || '',
      type: pkg.type || 'OUMRA',
      statut: pkg.statut || 'OUVERT',
      dateDepart: pkg.dateDepart?.slice(0, 10) || '',
      dateRetour: pkg.dateRetour?.slice(0, 10) || '',
      prixSingle: pkg.prixSingle || '',
      prixDouble: pkg.prixDouble || '',
      prixTriple: pkg.prixTriple || '',
      prixQuadruple: pkg.prixQuadruple || '',
      compagnieAerienne: pkg.compagnieAerienne || '',
      numeroVol: pkg.numeroVol || '',
      villeDepart: pkg.villeDepart || '',
      villeArrivee: pkg.villeArrivee || '',
      hotel: Array.isArray(pkg.hotel) ? pkg.hotel.join(', ') : (pkg.hotel || ''),
      quotaMax: pkg.quotaMax || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nomReference: form.nomReference,
        type: form.type,
        statut: form.statut,
        dateDepart: form.dateDepart,
        dateRetour: form.dateRetour,
        quotaMax: Number(form.quotaMax),
        prixSingle: form.prixSingle ? Number(form.prixSingle) : undefined,
        prixDouble: form.prixDouble ? Number(form.prixDouble) : undefined,
        prixTriple: form.prixTriple ? Number(form.prixTriple) : undefined,
        prixQuadruple: form.prixQuadruple ? Number(form.prixQuadruple) : undefined,
        compagnieAerienne: form.compagnieAerienne || undefined,
        numeroVol: form.numeroVol || undefined,
        villeDepart: form.villeDepart || undefined,
        villeArrivee: form.villeArrivee || undefined,
        hotel: form.hotel ? form.hotel.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      if (editId) await api.patch(`/packages/${editId}`, payload);
      else await api.post('/packages', payload);
      setShowModal(false); setEditId(null); setForm(EMPTY);
      fetchPackages();
      toast(editId ? 'Package mis à jour' : 'Package créé');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try { await api.delete(`/packages/${confirmId}`); fetchPackages(); toast('Package supprimé'); }
    catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
    finally { setConfirmId(null); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{packages.length} départ(s)</p>
        {canEdit && (
          <button onClick={() => { setEditId(null); setForm(EMPTY); setShowModal(true); }} className="btn-primary">
            + Nouveau départ
          </button>
        )}
      </div>

      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Départ</th>
                <th>Retour</th>
                <th>Places</th>
                <th>Prix Double</th>
                <th>Compagnie</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</td></tr>
              ) : packages.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun départ</td></tr>
              ) : packages.map(p => {
                const s = STATUT_COLORS[p.statut] || { bg: '#F3F4F6', color: '#6B7280' };
                return (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 700 }}>{p.nomReference}</td>
                    <td style={{ fontSize: 12 }}>{p.type}</td>
                    <td>
                      <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{p.statut}</span>
                    </td>
                    <td style={{ fontSize: 12 }}>{fmtDate(p.dateDepart)}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(p.dateRetour)}</td>
                    <td style={{ fontSize: 12 }}>
                      <span style={{ fontWeight: 600 }}>{p.placesReservees || 0}</span>
                      <span style={{ color: 'var(--text-muted)' }}>/{p.quotaMax}</span>
                    </td>
                    <td style={{ fontSize: 12 }}>{fmt(p.prixDouble)}</td>
                    <td style={{ fontSize: 12 }}>{p.compagnieAerienne || '—'}</td>
                    {canEdit && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openEdit(p)}
                            style={{ background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6, padding: '4px 10px', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Modifier
                          </button>
                          <button onClick={() => { if ((p.placesReservees || 0) > 0) { toast('Impossible : des inscriptions existent', 'error'); return; } setConfirmId(p._id); }}
                            style={{ background: 'rgba(220,38,38,0.08)', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Supprimer
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Modifier le départ' : 'Nouveau départ'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Infos générales */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Informations générales</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Nom de référence *</label>
              <input value={form.nomReference} onChange={set('nomReference')} className="premium-input" required placeholder="Ex: OUMRA-JAN-2026" />
            </div>
            <div>
              <label className="input-label">Type *</label>
              <select value={form.type} onChange={set('type')} className="premium-input">
                {['OUMRA', 'HAJJ', 'ZIAR_FES', 'ZIARRA', 'TOURISME', 'BILLET'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Statut</label>
              <select value={form.statut} onChange={set('statut')} className="premium-input">
                {['OUVERT', 'COMPLET', 'ANNULE', 'TERMINE'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Date départ *</label>
              <input type="date" value={form.dateDepart} onChange={set('dateDepart')} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Date retour *</label>
              <input type="date" value={form.dateRetour} onChange={set('dateRetour')} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Quota max (places) *</label>
              <input type="number" min="1" value={form.quotaMax} onChange={set('quotaMax')} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Hôtel(s) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(séparés par virgule)</span></label>
              <input value={form.hotel} onChange={set('hotel')} className="premium-input" placeholder="Hôtel Makkah, Hôtel Madinah" />
            </div>
          </div>

          {/* Prix par chambre */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Prix par type de chambre (FCFA)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['prixSingle', 'Single'], ['prixDouble', 'Double'], ['prixTriple', 'Triple'], ['prixQuadruple', 'Quadruple']].map(([k, l]) => (
              <div key={k}>
                <label className="input-label">{l}</label>
                <input type="number" min="0" value={form[k]} onChange={set(k)} className="premium-input" placeholder="0" />
              </div>
            ))}
          </div>

          {/* Vol */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Informations vol</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Compagnie aérienne</label>
              <input value={form.compagnieAerienne} onChange={set('compagnieAerienne')} className="premium-input" placeholder="Air Sénégal, Royal Air Maroc..." />
            </div>
            <div>
              <label className="input-label">Numéro de vol</label>
              <input value={form.numeroVol} onChange={set('numeroVol')} className="premium-input" placeholder="HC 401" />
            </div>
            <div>
              <label className="input-label">Ville de départ</label>
              <input value={form.villeDepart} onChange={set('villeDepart')} className="premium-input" placeholder="Dakar" />
            </div>
            <div>
              <label className="input-label">Ville d'arrivée</label>
              <input value={form.villeArrivee} onChange={set('villeArrivee')} className="premium-input" placeholder="Djeddah" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : (editId ? 'Mettre à jour' : 'Créer le départ')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        message="Supprimer ce départ définitivement ?"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
