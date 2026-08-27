import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, AlertCircle, User, Calendar, FileText } from 'lucide-react';
import Modal from '../../../components/Modal';
import shopService from '../../../services/shopService';

export default function StockHistoryModal({ 
  isOpen, 
  onClose, 
  produitId,
  produitNom
}) {
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    limit: 20,
    skip: 0,
    total: 0,
    hasMore: false
  });

  useEffect(() => {
    if (isOpen && produitId) {
      chargerHistorique();
    }
  }, [isOpen, produitId]);

  const chargerHistorique = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shopService.getHistoriqueMouvements(produitId, {
        limit: pagination.limit,
        skip: pagination.skip
      });
      
      setMouvements(response.data.mouvements);
      setPagination(prev => ({
        ...prev,
        ...response.data.pagination
      }));
    } catch (err) {
      console.error('Erreur chargement historique:', err);
      setError('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'AJOUT':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'RETRAIT':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'SET':
      case 'CORRECTION':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeBadge = (type) => {
    const badges = {
      AJOUT: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ajout' },
      RETRAIT: { bg: 'bg-red-100', text: 'text-red-700', label: 'Retrait' },
      SET: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Définir' },
      CORRECTION: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Correction' },
      INVENTAIRE: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Inventaire' }
    };
    return badges[type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: type };
  };

  const getMotifLabel = (motif) => {
    const labels = {
      VENTE: '🛒 Vente',
      ACHAT_FOURNISSEUR: '📦 Achat fournisseur',
      RETOUR_CLIENT: '↩️ Retour client',
      CASSE: '❌ Casse',
      PERTE: '🚫 Perte',
      INVENTAIRE_CORRECTION: '📊 Inventaire',
      TRANSFERT_MAGASIN: '🚚 Transfert',
      AJUSTEMENT_COMPTABLE: '💼 Comptabilité',
      AUTRE: 'Autre'
    };
    return labels[motif] || motif;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const typeConfig = (mouvement) => {
    const config = getTypeBadge(mouvement.type);
    return config;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Historique Stock - ${produitNom}`} size="lg">
      <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
        
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              display: 'inline-block',
              width: '32px',
              height: '32px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : mouvements.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 0',
            color: 'var(--text-secondary)'
          }}>
            <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>Aucun mouvement de stock enregistré</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mouvements.map((mouvement, idx) => {
              const config = typeConfig(mouvement);
              const diff = mouvement.stockApres - mouvement.stockAvant;
              
              return (
                <div
                  key={mouvement._id || idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: '16px',
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    alignItems: 'center'
                  }}
                >
                  {/* Icône type */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', backgroundColor: 'white', borderRadius: '8px' }}>
                    {getTypeIcon(mouvement.type)}
                  </div>

                  {/* Infos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {getMotifLabel(mouvement.motif)}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                      <strong>{mouvement.stockAvant}</strong>
                      {' '}{mouvement.type === 'AJOUT' ? '➕' : mouvement.type === 'RETRAIT' ? '➖' : '⟹'}{' '}
                      <strong>{mouvement.stockApres}</strong>
                      {diff !== 0 && (
                        <span style={{ marginLeft: '8px', color: diff > 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                          ({diff > 0 ? '+' : ''}{diff})
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {formatDate(mouvement.dateEvenement)}
                      </span>
                      {mouvement.userId && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={14} />
                          {mouvement.userId.nom} {mouvement.userId.prenom}
                        </span>
                      )}
                    </div>

                    {mouvement.notes && (
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                        marginTop: '4px',
                        padding: '6px 8px',
                        backgroundColor: 'white',
                        borderLeft: '3px solid var(--primary)',
                        borderRadius: '4px'
                      }}>
                        💬 {mouvement.notes}
                      </div>
                    )}
                  </div>

                  {/* Quantité */}
                  <div style={{
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '4px'
                  }}>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : 'var(--text-main)'
                    }}>
                      {Math.abs(mouvement.quantite)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {mouvement.type === 'AJOUT' ? 'ajouté' : mouvement.type === 'RETRAIT' ? 'retiré' : 'défini'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && mouvements.length > 0 && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            <span>
              Affichage de {mouvements.length} à {Math.min(pagination.skip + pagination.limit, pagination.total)} sur {pagination.total}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setPagination(p => ({ ...p, skip: Math.max(0, p.skip - p.limit) }));
                  setTimeout(chargerHistorique, 0);
                }}
                disabled={pagination.skip === 0}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'white',
                  cursor: pagination.skip === 0 ? 'not-allowed' : 'pointer',
                  opacity: pagination.skip === 0 ? 0.5 : 1
                }}
              >
                ← Précédent
              </button>
              <button
                onClick={() => {
                  setPagination(p => ({ ...p, skip: p.skip + p.limit }));
                  setTimeout(chargerHistorique, 0);
                }}
                disabled={!pagination.hasMore}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'white',
                  cursor: !pagination.hasMore ? 'not-allowed' : 'pointer',
                  opacity: !pagination.hasMore ? 0.5 : 1
                }}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}
