import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../core/api/axios';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Modal from '../../../components/Modal';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

const fmt = (n) => {
  if (n === null || n === undefined) return '0 FCFA';
  const v = parseFloat(n);
  return isNaN(v) ? '0 FCFA' : v.toLocaleString('fr-FR') + ' FCFA';
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

// Couleurs statut client (valeurs Supabase)
const STATUT_CLIENT_STYLES = {
  Inscrit: { bg: '#EFF6FF', color: '#2563EB' },
  Confirmé: { bg: '#F0FDF4', color: '#16A34A' },
  Parti: { bg: '#FFF7ED', color: '#EA580C' },
  Rentré: { bg: '#F0FDF4', color: '#15803D' },
  Désisté: { bg: '#FFFBEB', color: '#D97706' },
  Annulé: { bg: '#FEF2F2', color: '#DC2626' },
};

// Couleurs statut paiement (valeurs Supabase)
const STATUT_PAIEMENT_STYLES = {
  'Non payé': { bg: '#FEF2F2', color: '#DC2626' },
  'Acompte versé': { bg: '#FFFBEB', color: '#D97706' },
  Soldé: { bg: '#F0FDF4', color: '#16A34A' },
};

const SERVICE_EMOJIS = { Omra: '🕋', Hajj: '🕌', Ziyara: '🌙' };

const STATUTS_CLIENT_LIST = ['Inscrit', 'Confirmé', 'Parti', 'Rentré', 'Désisté', 'Annulé'];
const MODES_PAIEMENT = ['Espèces', 'Virement', 'Orange Money', 'Wave', 'Chèque', 'Carte bancaire', 'Autre'];

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Récupérer l'utilisateur connecté
  const [inscription, setInscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Paiement
  const [showPaiement, setShowPaiement] = useState(false);
  const [paiementForm, setPaiementForm] = useState({
    montant: '', date_paiement: '', mode_paiement: 'Espèces', reference: '', notes: ''
  });
  const [savingPaiement, setSavingPaiement] = useState(false);

  // Suppléments
  const [showAddSupplement, setShowAddSupplement] = useState(false);
  const [availableSupplements, setAvailableSupplements] = useState([]);
  const [suppForm, setSuppForm] = useState({ supplementId: '', quantite: 1 });
  const [savingSupp, setSavingSupp] = useState(false);

  const fetchAll = async () => {
    try {
      // Le backend retourne { success: true, data: { ...inscription, departs, clients, paiements } }
      const res = await api.get(`/reservations/${id}`);
      const data = res.data.data || res.data.reservation;
      if (!data) throw new Error('Réponse inattendue');
      setInscription(data);
    } catch (e) {
      console.error('Erreur chargement inscription:', e);
      setError('Impossible de charger les détails de cette inscription.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleStatutClient = async (statut_client) => {
    try {
      await api.patch(`/reservations/${id}`, { statut_client });
      toast('Statut mis à jour');
      fetchAll();
    } catch (e) {
      toast(e.response?.data?.message || 'Erreur mise à jour statut', 'error');
    }
  };

  const handlePaiement = async (e) => {
    e.preventDefault();
    setSavingPaiement(true);
    setError('');
    try {
      await api.post(`/paiements`, {
        inscription_id: id,
        montant: Number(paiementForm.montant),
        date_paiement: paiementForm.date_paiement || new Date().toISOString(),
        mode_paiement: paiementForm.mode_paiement,
        reference: paiementForm.reference || null,
        notes: paiementForm.notes || null,
      });
      toast('Paiement enregistré');
      setShowPaiement(false);
      setPaiementForm({ montant: '', date_paiement: '', mode_paiement: 'Espèces', reference: '', notes: '' });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setSavingPaiement(false);
    }
  };

  const openAddSuppModal = async () => {
    try {
      const res = await api.get('/supplements');
      const all = res.data.supplements || res.data.data || [];
      const actives = all.filter(s => s.actif !== false);
      setAvailableSupplements(actives);
      if (actives.length > 0) {
        setSuppForm({ supplementId: actives[0]._id || actives[0].id || '', quantite: 1 });
      }
      setShowAddSupplement(true);
    } catch (err) {
      toast('Erreur lors du chargement des suppléments', 'error');
    }
  };

  const handleAddSupplement = async (e) => {
    e.preventDefault();
    if (!suppForm.supplementId) return toast('Sélectionnez un supplément', 'error');
    setSavingSupp(true);
    try {
      await api.post(`/reservations/${id}/supplements`, suppForm);
      toast('Supplément ajouté avec succès');
      setShowAddSupplement(false);
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de l\'ajout du supplément', 'error');
    } finally { setSavingSupp(false); }
  };

  const handleDeleteSupplement = async (ligneId) => {
    if (!window.confirm('Retirer ce supplément de la réservation ?')) return;
    try {
      await api.delete(`/reservations/${id}/supplements/${ligneId}`);
      toast('Supplément retiré');
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    }
  };

  const handleDeleteInscription = async () => {
    setDeleting(true);
    try {
      await api.delete(`/reservations/${id}`);
      toast('Inscription supprimée');
      navigate('/dashboard/reservations');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
      <div style={{ width: 28, height: 28, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!inscription) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: 'var(--danger)', fontSize: 15, fontWeight: 600 }}>Inscription introuvable</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>{error || 'Vérifiez que l\'ID est correct.'}</p>
      <button onClick={() => navigate('/dashboard/reservations')}
        className="btn-secondary" style={{ marginTop: 16, fontSize: 13 }}>
        ← Retour aux inscriptions
      </button>
    </div>
  );

  const insc = inscription;
  const depart = insc.departs || {};
  const client = insc.clients || {};
  const paiements = insc.paiements || [];
  const lignesSupplements = insc.lignes_supplements || [];

  // Calcul finances
  const prixTotal = insc.prix_total || 0;
  const totalPaye = paiements.reduce((s, p) => s + (p.montant || 0), 0) || (insc.acompte || 0);
  const reste = Math.max(0, prixTotal - totalPaye);
  const isSolde = reste <= 0;

  const statutClient = insc.statut_client || 'Inscrit';
  const statutPaiement = insc.statut_paiement || 'Non payé';
  const stClient = STATUT_CLIENT_STYLES[statutClient] || { bg: '#F3F4F6', color: '#6B7280' };
  const stPaiement = STATUT_PAIEMENT_STYLES[statutPaiement] || { bg: '#F3F4F6', color: '#6B7280' };
  const svcEmoji = SERVICE_EMOJIS[insc.service] || ' ';

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800 }}>
      {/* Breadcrumb */}
      <button onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
        ← Retour
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{svcEmoji}</span>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
                {depart.nom_depart || insc.service || 'Inscription'}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                N° {insc.numero || insc.id?.slice(0, 8)}
                {insc.formule ? ` · ${insc.formule}` : ''}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '7px 16px', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          Supprimer
        </button>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Statuts */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ background: stClient.bg, color: stClient.color, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>
          Client : {statutClient}
        </span>
        <span style={{ background: stPaiement.bg, color: stPaiement.color, borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>
          Paiement : {statutPaiement}
        </span>
      </div>

      {/* Infos départ + finances */}
      <div className="premium-card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
          Détails du voyage
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Voyage</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{depart.nom_depart || insc.service || '—'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{insc.service || '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Dates</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
              {fmtDate(depart.date_depart || insc.date_depart)}
            </p>
            {depart.date_retour && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Retour : {fmtDate(depart.date_retour)}
              </p>
            )}
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Formule</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{insc.formule || '—'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{insc.type_chambre || ''}</p>
          </div>
          {insc.hotel_makkah && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Hôtel La Mecque</p>
              <p style={{ fontSize: 13, color: 'var(--text-main)' }}>🕋 {insc.hotel_makkah}</p>
              {insc.nb_nuits_makkah && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{insc.nb_nuits_makkah} nuits</p>}
            </div>
          )}
          {insc.hotel_medine && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Hôtel Médine</p>
              <p style={{ fontSize: 13, color: 'var(--text-main)' }}>🌙 {insc.hotel_medine}</p>
              {insc.nb_nuits_medine && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{insc.nb_nuits_medine} nuits</p>}
            </div>
          )}
          {insc.notes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Notes</p>
              <p style={{ fontSize: 13, color: 'var(--text-main)', fontStyle: 'italic' }}>{insc.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Client */}
      <div className="premium-card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
          Client
        </h2>
        {client.id ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                {(client.prenom || client.nom || '?')[0]}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                  {client.prenom} {client.nom}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {client.telephone || ''}{client.n_passeport ? ` · ${client.n_passeport}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/dashboard/clients/${client.id}`)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Voir le dossier →
            </button>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>Client non renseigné</p>
        )}
      </div>

      {/* Finances */}
      <div className="premium-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
            Finances
          </h2>
          {/* Bouton visible seulement pour les comptables et DG */}
          {(user?.role === 'comptable' || user?.role === 'dg') && (
            <button onClick={() => setShowPaiement(true)} className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
              + Ajouter un paiement
            </button>
          )}
        </div>

        {/* Résumé financier */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-main)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total dû</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>{fmt(prixTotal)}</p>
          </div>
          <div style={{ background: 'var(--bg-main)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total payé</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#16A34A', marginTop: 4 }}>{fmt(totalPaye)}</p>
          </div>
          <div style={{ background: isSolde ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reste à payer</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: isSolde ? '#16A34A' : '#DC2626', marginTop: 4 }}>
              {isSolde ? '✓ Soldé' : fmt(reste)}
            </p>
          </div>
        </div>

        {/* Historique paiements */}
        {paiements.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>Aucun paiement enregistré</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mode</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Référence</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((p, i) => (
                  <tr key={p.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>{fmtDate(p.date_paiement || p.dateReglement)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: 'var(--bg-main)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                        {p.mode_paiement || p.mode || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#16A34A' }}>{fmt(p.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suppléments */}
      <div className="premium-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            Suppléments ({lignesSupplements.length})
          </h2>
          <button onClick={openAddSuppModal} className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
            + Ajouter un supplément
          </button>
        </div>

        {lignesSupplements.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>Aucun supplément associé à cette inscription</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Option</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantité</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prix unit.</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {lignesSupplements.map((ls, i) => (
                  <tr key={ls.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{ls.supplements?.nom || 'Supplément'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ background: 'var(--bg-main)', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        x{ls.quantite || 1}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{fmt(ls.prix_unitaire)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{fmt(ls.prix_total)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteSupplement(ls.id)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 13, cursor: 'pointer', padding: 4 }}
                        title="Retirer ce supplément"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Changement de statut client */}
      <div className="premium-card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>
          Changer le statut du client
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STATUTS_CLIENT_LIST.map(s => {
            const st = STATUT_CLIENT_STYLES[s] || { bg: '#F3F4F6', color: '#6B7280' };
            const isCurrent = statutClient === s;
            return (
              <button key={s}
                onClick={() => !isCurrent && handleStatutClient(s)}
                disabled={isCurrent}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: isCurrent ? `2px solid ${st.color}` : '2px solid transparent',
                  cursor: isCurrent ? 'default' : 'pointer',
                  background: st.bg, color: st.color,
                  opacity: isCurrent ? 1 : 0.7,
                  transition: 'all 0.15s',
                }}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal ajouter supplément */}
      <Modal open={showAddSupplement} onClose={() => setShowAddSupplement(false)} title="Ajouter un supplément à l'inscription">
        <form onSubmit={handleAddSupplement} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Supplément / Prestation *</label>
            <select
              value={suppForm.supplementId}
              onChange={e => setSuppForm(f => ({ ...f, supplementId: e.target.value }))}
              className="premium-input"
              required
            >
              {availableSupplements.map(s => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.nom} — {Number(s.prix?.$numberDecimal || s.prix || 0).toLocaleString('fr-FR')} FCFA
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Quantité *</label>
            <input
              type="number"
              min="1"
              max="20"
              value={suppForm.quantite}
              onChange={e => setSuppForm(f => ({ ...f, quantite: parseInt(e.target.value, 10) || 1 }))}
              className="premium-input"
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={() => setShowAddSupplement(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={savingSupp} className="btn-primary">
              {savingSupp ? 'Ajout...' : 'Ajouter le supplément'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal ajouter paiement */}
      <Modal open={showPaiement} onClose={() => setShowPaiement(false)} title="Enregistrer un paiement">
        <form onSubmit={handlePaiement} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Montant (FCFA) *</label>
              <input
                type="number"
                min="1"
                value={paiementForm.montant}
                onChange={e => setPaiementForm(f => ({ ...f, montant: e.target.value }))}
                className="premium-input"
                placeholder="Ex: 500000"
                required
              />
            </div>
            <div>
              <label className="input-label">Date du paiement *</label>
              <input
                type="date"
                value={paiementForm.date_paiement}
                onChange={e => setPaiementForm(f => ({ ...f, date_paiement: e.target.value }))}
                className="premium-input"
                required
              />
            </div>
            <div>
              <label className="input-label">Mode de paiement</label>
              <select
                value={paiementForm.mode_paiement}
                onChange={e => setPaiementForm(f => ({ ...f, mode_paiement: e.target.value }))}
                className="premium-input">
                {MODES_PAIEMENT.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Référence / N° reçu</label>
              <input
                value={paiementForm.reference}
                onChange={e => setPaiementForm(f => ({ ...f, reference: e.target.value }))}
                className="premium-input"
                placeholder="Facultatif"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Notes</label>
              <input
                value={paiementForm.notes}
                onChange={e => setPaiementForm(f => ({ ...f, notes: e.target.value }))}
                className="premium-input"
                placeholder="Facultatif"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowPaiement(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={savingPaiement} className="btn-primary">
              {savingPaiement ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        message={`Supprimer définitivement l'inscription N° ${insc.numero || insc.id?.slice(0, 8)} ? Cette action est irréversible.`}
        onConfirm={handleDeleteInscription}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
