import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Package, AlertTriangle } from 'lucide-react';
import Modal from '../../../components/Modal';
import shopService from '../../../services/shopService';
import { toast } from '../../../components/Toast';

export default function StockAdjustmentModal({ isOpen, onClose, produit, onSuccess }) {
  const [formData, setFormData] = useState({
    type: 'AJOUT',
    quantite: '',
    motif: 'AUTRE',
    notes: '',
    referenceExterne: '',
    documentSource: 'AUTRE'
  });
  const [loading, setLoading] = useState(false);

  const typesAjustement = shopService.getTypesAjustementOptions();
  const motifsAjustement = shopService.getMotifsAjustementOptions();

  // Réinitialiser le formulaire à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: 'AJOUT',
        quantite: '',
        motif: 'AUTRE',
        notes: '',
        referenceExterne: '',
        documentSource: 'AUTRE'
      });
    }
  }, [isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateNewStock = () => {
    if (!formData.quantite || !produit) return produit?.stock || 0;
    
    const quantite = parseInt(formData.quantite) || 0;
    const stockActuel = produit.stock || 0;
    
    switch (formData.type) {
      case 'AJOUT':
        return stockActuel + quantite;
      case 'RETRAIT':
        return Math.max(0, stockActuel - quantite);
      case 'SET':
        return quantite;
      default:
        return stockActuel;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.quantite || parseInt(formData.quantite) <= 0) {
      toast('Veuillez saisir une quantité valide', 'error');
      return;
    }

    const quantite = parseInt(formData.quantite);
    const nouveauStock = calculateNewStock();
    
    if (formData.type === 'RETRAIT' && nouveauStock < 0) {
      toast('Stock insuffisant pour ce retrait', 'error');
      return;
    }

    setLoading(true);
    try {
      await shopService.ajusterStock(produit._id, {
        type: formData.type,
        quantite,
        motif: formData.motif,
        notes: formData.notes,
        referenceExterne: formData.referenceExterne,
        documentSource: formData.documentSource
      });

      toast('Stock ajusté avec succès', 'success');
      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de l\'ajustement du stock';
      toast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!produit) return null;

  const stockActuel = produit.stock || 0;
  const nouveauStock = calculateNewStock();
  const isRisque = nouveauStock <= (produit.stockMin || 0);

  return (
    <Modal open={isOpen} onClose={onClose} title="Ajustement de stock" size="md">
      <div className="space-y-6">
        {/* Informations du produit */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">{produit.nom}</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Stock actuel:</span>
              <span className="font-medium">{stockActuel} unités</span>
            </div>
            <div className="flex justify-between">
              <span>Stock minimum:</span>
              <span>{produit.stockMin || 0} unités</span>
            </div>
            <div className="flex justify-between">
              <span>Catégorie:</span>
              <span>{produit.categorie}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type d'ajustement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'ajustement *
            </label>
            <div className="grid grid-cols-1 gap-2">
              {typesAjustement.map((type) => {
                const Icon = type.value === 'AJOUT' ? TrendingUp : 
                           type.value === 'RETRAIT' ? TrendingDown : Package;
                const colorClass = type.value === 'AJOUT' ? 'text-green-600' :
                                 type.value === 'RETRAIT' ? 'text-red-600' : 'text-blue-600';
                
                return (
                  <label 
                    key={type.value} 
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.type === type.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={type.value}
                      checked={formData.type === type.value}
                      onChange={(e) => handleChange('type', e.target.value)}
                      className="sr-only"
                    />
                    <Icon className={`h-5 w-5 ${colorClass}`} />
                    <div className="flex-1">
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantité *
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantite}
              onChange={(e) => handleChange('quantite', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: 10"
              required
            />
          </div>

          {/* Aperçu du nouveau stock */}
          {formData.quantite && (
            <div className={`p-3 rounded-lg border ${
              isRisque 
                ? 'border-orange-200 bg-orange-50' 
                : 'border-green-200 bg-green-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isRisque ? (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                ) : (
                  <Package className="h-4 w-4 text-green-600" />
                )}
                <span className="font-medium text-sm">Aperçu</span>
              </div>
              
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Stock avant:</span>
                  <span>{stockActuel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ajustement:</span>
                  <span>
                    {formData.type === 'AJOUT' && '+'}{formData.type === 'RETRAIT' && '-'}
                    {formData.type === 'SET' && '→ '}{formData.quantite}
                  </span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Stock après:</span>
                  <span className={isRisque ? 'text-orange-600' : 'text-green-600'}>
                    {nouveauStock}
                  </span>
                </div>
                
                {isRisque && (
                  <div className="text-orange-600 text-xs mt-2">
                    ⚠️ Stock inférieur ou égal au minimum recommandé
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Motif */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motif *
            </label>
            <select
              value={formData.motif}
              onChange={(e) => handleChange('motif', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {motifsAjustement.map((motif) => (
                <option key={motif.value} value={motif.value}>
                  {motif.label}
                </option>
              ))}
            </select>
          </div>

          {/* Référence externe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Référence externe (optionnel)
            </label>
            <input
              type="text"
              value={formData.referenceExterne}
              onChange={(e) => handleChange('referenceExterne', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="N° de commande, facture, bon..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows="3"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Détails sur cet ajustement..."
            />
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
              disabled={loading || !formData.quantite}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Ajustement...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Confirmer l'ajustement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}