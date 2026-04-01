import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

const statutBadge = {
  EN_ATTENTE: 'bg-yellow-100 text-yellow-800',
  CONFIRMEE: 'bg-blue-100 text-blue-800',
  PAYEE: 'bg-green-100 text-green-800',
  ANNULEE: 'bg-red-100 text-red-800',
};

const MODES = ['CARTE_BANCAIRE','VIREMENT','ORANGE_MONEY','WAVE','MONEY','ESPECES','AUTRE'];
const STATUTS = ['EN_ATTENTE','CONFIRMEE','PAYEE','ANNULEE'];

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [supplements, setSupplements] = useState([]);
  const [allSupplements, setAllSupplements] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Paiement form
  const [showPaiement, setShowPaiement] = useState(false);
  const [paiementForm, setPaiementForm] = useState({ montant: '', dateReglement: '', mode: 'ESPECES', reference: '' });
  const [savingPaiement, setSavingPaiement] = useState(false);

  // Supplément form
  const [showSupp, setShowSupp] = useState(false);
  const [suppForm, setSuppForm] = useState({ clientId: '', supplementId: '', quantite: 1 });
  const [savingSupp, setSavingSupp] = useState(false);

  const fetchAll = async () => {
    try {
      const [r, s, lignes, clients] = await Promise.all([
        api.get(`/reservations/${id}`),
        api.get('/supplements'),
        api.get(`/reservations/${id}/supplements`),
        api.get('/clients'),
      ]);
      setReservation(r.data.reservation);
      setAllSupplements(s.data.supplements || []);
      setSupplements(lignes.data.lignes || []);
      setAllClients(clients.data.clients || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const STATUTS_CLIENT = ['INSCRIT', 'CONFIRME', 'PARTI', 'RENTRE', 'DESISTE', 'ANNULE'];
  const STATUTS_PAIEMENT = { EN_ATTENTE: 'badge-neutral', PARTIEL: 'badge-warning', SOLDE: 'badge-success' };

  const handleStatutClient = async (statutClient) => {
    try {
      await api.patch(`/reservations/${id}/statut-client`, { statutClient });
      fetchAll();
    } catch (e) { alert(e.response?.data?.message || 'Erreur'); }
  };

  const handlePaiement = async (e) => {
    e.preventDefault();
    setSavingPaiement(true); setError('');
    try {
      await api.post(`/reservations/${id}/paiements`, { ...paiementForm, montant: Number(paiementForm.montant) });
      setShowPaiement(false);
      setPaiementForm({ montant: '', dateReglement: '', mode: 'ESPECES', reference: '' });
      fetchAll();
    } catch (err) { setError(err.response?.data?.message || 'Erreur'); }
    finally { setSavingPaiement(false); }
  };

  const handleSupp = async (e) => {
    e.preventDefault();
    setSavingSupp(true); setError('');
    try {
      await api.post(`/reservations/${id}/supplements`, { ...suppForm, quantite: Number(suppForm.quantite) });
      setShowSupp(false);
      setSuppForm({ clientId: '', supplementId: '', quantite: 1 });
      fetchAll();
    } catch (err) { setError(err.response?.data?.message || 'Erreur'); }
    finally { setSavingSupp(false); }
  };

  const handleDeleteSupp = async (ligneId) => {
    if (!confirm('Supprimer ce supplément ?')) return;
    try { await api.delete(`/reservations/${id}/supplements/${ligneId}`); fetchAll(); }
    catch (e) { alert(e.response?.data?.message || 'Erreur'); }
  };

  if (loading) return <p className="text-sm text-gray-500 p-8">Chargement...</p>;
  if (!reservation) return <p className="text-sm text-red-500 p-8">Réservation introuvable</p>;

  const r = reservation;
  const statut = statutBadge[r.statut] || 'bg-gray-100 text-gray-700';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/dashboard/reservations')} className="text-xs text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1">
            ← Retour aux réservations
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Réservation #{r.idReservation}</h1>
        </div>
        <a href={`/api/factures/reservation/${id}`} target="_blank" rel="noreferrer"
          className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
          Télécharger facture PDF
        </a>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Infos générales */}
      <div className="premium-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Informations</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statut}`}>{r.statut}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-gray-500">Package</p><p className="font-medium">{r.packageKId?.nomReference || '-'}</p></div>
          <div><p className="text-xs text-gray-500">Type</p><p className="font-medium">{r.packageKId?.type || '-'}</p></div>
          <div><p className="text-xs text-gray-500">Formule</p><p className="font-medium">{r.formule || '-'}</p></div>
          <div><p className="text-xs text-gray-500">Confort</p><p className="font-medium">{r.niveauConfort || '-'}</p></div>
          <div><p className="text-xs text-gray-500">Départ</p><p className="font-medium">{fmtDate(r.dateDepart)}</p></div>
          <div><p className="text-xs text-gray-500">Retour</p><p className="font-medium">{fmtDate(r.dateRetour)}</p></div>
          <div><p className="text-xs text-gray-500">Total dû</p><p className="font-bold text-gray-900">{fmt(r.montantTotalDu)}</p></div>
          <div><p className="text-xs text-gray-500">Reste à payer</p><p className={`font-bold text-lg ${r.resteAPayer > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(r.resteAPayer)}</p></div>
        </div>

        {/* Statuts séparés */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>STATUT CLIENT</p>
            <span className={`badge ${statut}`}>{r.statutClient || r.statut}</span>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>STATUT PAIEMENT</p>
            <span className={`badge ${STATUTS_PAIEMENT[r.statutPaiement] || 'badge-neutral'}`}>
              {r.statutPaiement || 'EN_ATTENTE'}
            </span>
          </div>
        </div>

        {/* Changement statut client */}
        <div style={{ marginTop: 4, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Changer statut client</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STATUTS_CLIENT.map(s => (
              <button key={s} onClick={() => handleStatutClient(s)}
                disabled={(r.statutClient || r.statut) === s}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  border: 'none', cursor: 'pointer', opacity: (r.statutClient || r.statut) === s ? 0.4 : 1,
                  background: s === 'PARTI' ? 'var(--primary)' : s === 'RENTRE' ? 'var(--success)' : s === 'DESISTE' || s === 'ANNULE' ? 'var(--danger)' : 'var(--info)',
                  color: 'white',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clients */}
      <div className="premium-card">
        <h2 className="font-semibold text-gray-800 mb-3">Clients ({r.clients?.length || 0})</h2>
        <div className="space-y-2">
          {(r.clients || []).map(c => (
            <div key={c._id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span>{c.nom} {c.prenom} — <span className="text-gray-500">{c.numeroPasseport}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Suppléments */}
      <div className="premium-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Suppléments</h2>
          <button onClick={() => setShowSupp(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
            + Ajouter
          </button>
        </div>

        {showSupp && (
          <form onSubmit={handleSupp} className="mb-4 rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client *</label>
                <select value={suppForm.clientId} onChange={e => setSuppForm(f => ({...f, clientId: e.target.value}))}
                  className="premium-input">
                  <option value="">Sélectionner...</option>
                  {(r.clients || []).map(c => <option key={c._id} value={c._id}>{c.nom} {c.prenom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplément *</label>
                <select value={suppForm.supplementId} onChange={e => setSuppForm(f => ({...f, supplementId: e.target.value}))}
                  className="premium-input">
                  <option value="">Sélectionner...</option>
                  {allSupplements.map(s => <option key={s._id} value={s._id}>{s.nom} — {fmt(s.prix)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantité *</label>
                <input type="number" min="1" value={suppForm.quantite} onChange={e => setSuppForm(f => ({...f, quantite: e.target.value}))}
                  className="premium-input" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingSupp}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
                {savingSupp ? '...' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => setShowSupp(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        )}

        {supplements.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun supplément</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-gray-500 text-left">
              <th className="pb-2 pr-4">Client</th><th className="pb-2 pr-4">Supplément</th>
              <th className="pb-2 pr-4">Qté</th><th className="pb-2 pr-4">Prix unit.</th>
              <th className="pb-2 pr-4">Total</th><th className="pb-2"></th>
            </tr></thead>
            <tbody>
              {supplements.map(l => (
                <tr key={l._id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{l.clientId?.nom} {l.clientId?.prenom}</td>
                  <td className="py-2 pr-4">{l.supplementId?.nom}</td>
                  <td className="py-2 pr-4">{l.quantite}</td>
                  <td className="py-2 pr-4">{fmt(l.prixUnitaire)}</td>
                  <td className="py-2 pr-4 font-medium">{fmt((l.prixUnitaire || 0) * (l.quantite || 1))}</td>
                  <td className="py-2">
                    <button onClick={() => handleDeleteSupp(l._id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paiements */}
      <div className="premium-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Paiements</h2>
          {r.statut !== 'ANNULEE' && r.statut !== 'PAYEE' && (
            <button onClick={() => setShowPaiement(true)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
              + Ajouter paiement
            </button>
          )}
        </div>

        {showPaiement && (
          <form onSubmit={handlePaiement} className="mb-4 rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Montant (FCFA) *</label>
                <input type="number" min="1" value={paiementForm.montant} onChange={e => setPaiementForm(f => ({...f, montant: e.target.value}))}
                  className="premium-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date règlement *</label>
                <input type="date" value={paiementForm.dateReglement} onChange={e => setPaiementForm(f => ({...f, dateReglement: e.target.value}))}
                  className="premium-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mode *</label>
                <select value={paiementForm.mode} onChange={e => setPaiementForm(f => ({...f, mode: e.target.value}))}
                  className="premium-input">
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Référence</label>
                <input value={paiementForm.reference} onChange={e => setPaiementForm(f => ({...f, reference: e.target.value}))}
                  className="premium-input" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingPaiement}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
                {savingPaiement ? '...' : 'Enregistrer'}
              </button>
              <button type="button" onClick={() => setShowPaiement(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </form>
        )}

        {(!r.paiements || r.paiements.length === 0) ? (
          <p className="text-sm text-gray-400">Aucun paiement</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-gray-500 text-left">
              <th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Mode</th>
              <th className="pb-2 pr-4">Référence</th><th className="pb-2 text-right">Montant</th>
            </tr></thead>
            <tbody>
              {r.paiements.map((p, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4">{fmtDate(p.dateReglement)}</td>
                  <td className="py-2 pr-4">{p.mode}</td>
                  <td className="py-2 pr-4 text-gray-500">{p.reference || '-'}</td>
                  <td className="py-2 text-right font-medium text-green-700">{fmt(p.montant ? parseFloat(p.montant.toString()) : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
