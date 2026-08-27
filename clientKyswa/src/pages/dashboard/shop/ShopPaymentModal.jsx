import { useState, useEffect } from 'react';
import { CreditCard, Calendar, Hash, FileText } from 'lucide-react';
import Modal from '../../../components/Modal';
import shopService from '../../../services/shopService';
import { toast } from '../../../components/Toast';

export default function ShopPaymentModal({ isOpen, onClose, order, onSuccess }) {
  const [formData, setFormData] = useState({
    montant: '',
    mode: 'ESPECES',
    reference: '',
    dateReglement: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  // Réinitialiser le formulaire à l'ouverture
  useEffect(() => {
    if (isOpen && order) {
      setFormData({
        montant: order.montantTotal?.toString() || '',
        mode: 'ESPECES',
        reference: '',
        dateReglement: new Date().toISOString().split('T')[0]
      });
    }
  }, [isOpen, order]);

  const modesPayment = shopService.getModesPaymentOptions();

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      toast('Veuillez saisir un montant valide', 'error');
      return;
    }

    if (parseFloat(formData.montant) < order.montantTotal) {
      toast('Le montant saisi est insuffisant', 'error');
      return;
    }

    setLoading(true);
    try {
      const paiementData = {
        ...formData,
        montant: parseFloat(formData.montant),
        dateReglement: new Date(formData.dateReglement)
      };

      await shopService.validerPaiementCommande(order._id, paiementData);
      toast('Paiement confirmé avec succès', 'success');
      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de la confirmation du paiement';
      toast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  const montantSaisi = parseFloat(formData.montant) || 0;
  const montantDu = order.montantTotal || 0;
  const monnaie = montantSaisi > montantDu ? montantSaisi - montantDu : 0;

  return (
    <Modal open={isOpen} onClose={onClose} title="Confirmer le paiement" size="md">
      <div className="space-y-6">
        {/* Informations de la commande */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Détails de la commande</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Numéro:</span>
              <span className="font-mono">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Client:</span>
              <span>{order.clientId?.nom} {order.clientId?.prenom}</span>
            </div>
            <div className="flex justify-between">
              <span>Articles:</span>
              <span>{order.items?.length} produit{order.items?.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total à payer:</span>
              <span className="text-lg text-blue-600">
                {shopService.formatPrice(montantDu)}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant reçu *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.montant}
                onChange={(e) => handleChange('montant', e.target.value)}
                className="w-full pl-3 pr-12 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                FCFA
              </div>
            </div>
            
            {montantSaisi > 0 && (
              <div className="mt-2 space-y-1 text-sm">
                {montantSaisi < montantDu && (
                  <div className="text-red-600">
                    Montant insuffisant (manque {shopService.formatPrice(montantDu - montantSaisi)})
                  </div>
                )}
                {monnaie > 0 && (
                  <div className="text-green-600">
                    Monnaie à rendre: {shopService.formatPrice(monnaie)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mode de paiement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mode de paiement *
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={formData.mode}
                onChange={(e) => handleChange('mode', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {modesPayment.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Référence (optionnelle pour certains modes) */}
          {['CARTE_BANCAIRE', 'VIREMENT', 'CHEQUE', 'MOBILE_MONEY'].includes(formData.mode) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Référence de transaction
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => handleChange('reference', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Numéro de transaction, chèque..."
                />
              </div>
            </div>
          )}

          {/* Date de règlement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de règlement *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={formData.dateReglement}
                onChange={(e) => handleChange('dateReglement', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={loading || montantSaisi < montantDu}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Confirmation...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Confirmer le paiement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}