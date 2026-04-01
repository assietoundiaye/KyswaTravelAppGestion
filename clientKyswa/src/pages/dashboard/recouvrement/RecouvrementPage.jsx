import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { toast } from '../../../components/Toast';
import Modal from '../../../components/Modal';
import { useAuth } from '../../../context/AuthContext';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function RecouvrementPage() {
  const { role } = useAuth();
  const [data, setData] = useState({ impayés: [], remboursements: [] });
  const [loading, setLoading] = useState(true);
  const [showRelance, setShowRelance] = useState(false);
  const [selectedResa, setSelectedResa] = useState(null);
  const [relanceForm, setRelanceForm] = useState({ resultat: 'JOINT', notes: '', dateProchaineRelance: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recouvrement');
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openRelance = (resa) => {
    setSelectedResa(resa);
    setShowRelance(true);
  };

  const handleRelance = async (e) => {
    e.preventDefault();
    if (!selectedResa) return;
    setSaving(true);
    try {
      await api.post('/recouvrement/relancer', {
        reservationId: selectedResa._id,
        clientId: selectedResa.clients?.[0]?._id,
        ...relanceForm,
      });
      toast('Relance enregistrée');
      setShowRelance(false);
      setRelanceForm({ resultat: 'JOINT', notes: '', dateProchaineRelance: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const joursRestants = (dateDepart) => {
    const diff = Math.floor((new Date(dateDepart) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
        Recouvrement
      </h1>

      {/* Impayés */}
      <div className="premium-card">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-main)' }}>
          Inscriptions impayées — départ dans moins de 30 jours ({data.impayés.length})
        </h2>
        {loading ? <p style={{ color: 'var(--text-muted)' }}>Chargement...</p> :
          data.impayés.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Aucun impayé urgent</p> :
          data.impayés.map(r => {
            const jours = joursRestants(r.dateDepart);
            return (
              <div key={r._id} style={{
                padding: '14px 16px', borderRadius: 'var(--radius-md)', marginBottom: 10,
                background: jours <= 7 ? 'var(--danger-bg)' : 'var(--warning-bg)',
                border: `1px solid ${jours <= 7 ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.2)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>
                      {r.numero || r.idReservation} — {r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ')}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Départ : {fmtDate(r.dateDepart)} · {jours} jours restants
                      {r.clients?.[0]?.telephone && ` · ${r.clients[0].telephone}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Reste à payer</p>
                      <p style={{ fontWeight: 800, fontSize: 18, color: jours <= 7 ? 'var(--danger)' : 'var(--warning)' }}>
                        {fmt(r.resteAPayer)}
                      </p>
                    </div>
                    <button onClick={() => openRelance(r)} className="btn-primary" style={{ fontSize: 12, padding: '8px 14px' }}>
                      📞 Relancer
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Remboursements en attente — pas pour les commerciaux */}
      {!['commercial'].includes(role) && data.remboursements?.length > 0 && (
        <div className="premium-card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-main)' }}>
            Remboursements en attente ({data.remboursements.length})
          </h2>
          {data.remboursements.map(d => (
            <div key={d._id} style={{
              padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 8,
              background: 'var(--info-bg)', border: '1px solid rgba(37,99,235,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{d.clientId?.nom} {d.clientId?.prenom}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Résa {d.reservationId?.numero || d.reservationId?.idReservation} · {d.tauxRemboursement}%
                </p>
              </div>
              <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--info)' }}>{fmt(d.montantRembourse)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal relance */}
      <Modal open={showRelance} onClose={() => setShowRelance(false)} title="Enregistrer une relance" size="sm">
        <form onSubmit={handleRelance} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Résultat *</label>
            <select value={relanceForm.resultat} onChange={e => setRelanceForm(f => ({...f, resultat: e.target.value}))} className="premium-input">
              <option value="JOINT">Joint</option>
              <option value="NON_JOINT">Non joint</option>
              <option value="PROMESSE_PAIEMENT">Promesse de paiement</option>
              <option value="REFUSE">Refus de payer</option>
            </select>
          </div>
          <div>
            <label className="input-label">Notes</label>
            <textarea value={relanceForm.notes} onChange={e => setRelanceForm(f => ({...f, notes: e.target.value}))}
              className="premium-input" rows={3} />
          </div>
          <div>
            <label className="input-label">Prochaine relance</label>
            <input type="date" value={relanceForm.dateProchaineRelance}
              onChange={e => setRelanceForm(f => ({...f, dateProchaineRelance: e.target.value}))}
              className="premium-input" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowRelance(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
