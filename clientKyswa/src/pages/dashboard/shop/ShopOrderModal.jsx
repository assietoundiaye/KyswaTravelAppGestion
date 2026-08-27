import { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Package } from 'lucide-react';
import Modal from '../../../components/Modal';
import ClientSelector from './ClientSelector';
import shopService from '../../../services/shopService';
import { toast } from '../../../components/Toast';

export default function ShopOrderModal({ isOpen, onClose, produits = [], onSuccess }) {
  const [clientId, setClientId] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Réinitialiser le formulaire à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setClientId('');
      setSelectedProducts([]);
      setNotes('');
    }
  }, [isOpen]);

  const addProduct = (produit) => {
    const exists = selectedProducts.find(item => item.produitId === produit._id);
    if (!exists) {
      setSelectedProducts(current => [
        ...current,
        {
          produitId: produit._id,
          produit,
          quantite: 1
        }
      ]);
    }
  };

  const removeProduct = (produitId) => {
    setSelectedProducts(current => 
      current.filter(item => item.produitId !== produitId)
    );
  };

  const updateQuantite = (produitId, quantite) => {
    const qty = Math.max(1, parseInt(quantite) || 1);
    setSelectedProducts(current =>
      current.map(item => 
        item.produitId === produitId 
          ? { ...item, quantite: qty }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((total, item) => {
      const prix = shopService.getPrixAffichage(item.produit);
      return total + (prix * item.quantite);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!clientId) {
      toast('Veuillez sélectionner un client', 'error');
      return;
    }
    
    if (selectedProducts.length === 0) {
      toast('Veuillez sélectionner au moins un produit', 'error');
      return;
    }

    // Vérifier la disponibilité du stock
    for (const item of selectedProducts) {
      if (item.produit.stock < item.quantite) {
        toast(`Stock insuffisant pour ${item.produit.nom}`, 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const commandeData = {
        clientId,
        notes,
        items: selectedProducts.map(item => ({
          produitId: item.produitId,
          quantite: item.quantite
        }))
      };

      await shopService.createCommande(commandeData);
      toast('Commande créée avec succès', 'success');
      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de la création de la commande';
      toast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Créer une commande shop" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélection du client */}
        <ClientSelector 
          selectedClientId={clientId}
          onClientSelect={setClientId}
        />

        {/* Sélection des produits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Produits disponibles
          </label>
          
          <div className="border border-gray-200 rounded-lg max-h-60 overflow-auto">
            {produits.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Aucun produit disponible
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {produits.map((produit) => {
                  const isSelected = selectedProducts.some(item => item.produitId === produit._id);
                  const isOutOfStock = produit.stock === 0;
                  
                  return (
                    <div key={produit._id} className={`p-3 flex items-center justify-between hover:bg-gray-50 ${isOutOfStock ? 'opacity-50' : ''}`}>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{produit.nom}</div>
                        <div className="text-sm text-gray-500">
                          Stock: {produit.stock} • {shopService.formatPrice(shopService.getPrixAffichage(produit))}
                          {produit.prixPromo && (
                            <span className="ml-2 line-through text-gray-400">
                              {shopService.formatPrice(produit.prix)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => addProduct(produit)}
                        disabled={isSelected || isOutOfStock}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isOutOfStock
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isSelected ? 'Ajouté' : isOutOfStock ? 'Rupture' : 'Ajouter'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Produits sélectionnés */}
        {selectedProducts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Panier ({selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''})
            </label>
            
            <div className="border border-gray-200 rounded-lg">
              <div className="divide-y divide-gray-100">
                {selectedProducts.map((item) => (
                  <div key={item.produitId} className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.produit.nom}</div>
                      <div className="text-sm text-gray-500">
                        {shopService.formatPrice(shopService.getPrixAffichage(item.produit))} × {item.quantite} = 
                        <span className="font-medium ml-1">
                          {shopService.formatPrice(shopService.getPrixAffichage(item.produit) * item.quantite)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantite(item.produitId, item.quantite - 1)}
                        disabled={item.quantite <= 1}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      
                      <input
                        type="number"
                        min="1"
                        max={item.produit.stock}
                        value={item.quantite}
                        onChange={(e) => updateQuantite(item.produitId, e.target.value)}
                        className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                      />
                      
                      <button
                        type="button"
                        onClick={() => updateQuantite(item.produitId, item.quantite + 1)}
                        disabled={item.quantite >= item.produit.stock}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => removeProduct(item.produitId)}
                        className="w-8 h-8 rounded border border-red-300 text-red-600 flex items-center justify-center hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Total */}
                <div className="p-3 bg-gray-50 font-semibold flex justify-between items-center">
                  <span>Total de la commande:</span>
                  <span className="text-lg text-blue-600">
                    {shopService.formatPrice(calculateTotal())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            placeholder="Commentaires ou instructions spéciales..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            disabled={loading || !clientId || selectedProducts.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Création...
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                Créer la commande
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
