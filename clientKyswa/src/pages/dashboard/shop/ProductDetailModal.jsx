import { useState, useEffect } from 'react';
import { 
  Package, Tag, Barcode, Ruler, Weight, User, 
  Calendar, History, TrendingUp, TrendingDown 
} from 'lucide-react';
import Modal from '../../../components/Modal';
import shopService from '../../../services/shopService';
import { toast } from '../../../components/Toast';

export default function ProductDetailModal({ isOpen, onClose, produitId }) {
  const [produit, setProduit] = useState(null);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (isOpen && produitId) {
      loadProduitDetails();
    }
  }, [isOpen, produitId]);

  const loadProduitDetails = async () => {
    setLoading(true);
    try {
      const [produitResponse, mouvementsResponse] = await Promise.all([
        shopService.getProduitById(produitId),
        shopService.getMouvementsStock(produitId, { limit: 20 })
      ]);
      
      setProduit(produitResponse.produit);
      setMouvements(mouvementsResponse.mouvements || []);
    } catch (error) {
      console.error('Erreur chargement détails produit:', error);
      toast('Erreur lors du chargement des détails', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatutColor = (statut) => {
    const colors = {
      'ACTIF': 'bg-green-100 text-green-800',
      'INACTIF': 'bg-gray-100 text-gray-800', 
      'RUPTURE_STOCK': 'bg-red-100 text-red-800',
      'ARCHIVE': 'bg-gray-100 text-gray-600'
    };
    return colors[statut] || 'bg-gray-100 text-gray-800';
  };

  const getTypeMovementIcon = (type) => {
    switch (type) {
      case 'AJOUT': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'RETRAIT': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'SET': return <Package className="h-4 w-4 text-blue-600" />;
      default: return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Modal open={isOpen} onClose={onClose} title="Détails du produit" size="lg">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </Modal>
    );
  }

  if (!produit) {
    return null;
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Détails du produit" size="xl">
      <div className="space-y-6">
        {/* En-tête avec informations principales */}
        <div className="border-b pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{produit.nom}</h2>
              <p className="text-gray-600 mt-1">{produit.description}</p>
              
              <div className="flex items-center gap-4 mt-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatutColor(produit.statut)}`}>
                  {produit.statut}
                </span>
                <span className="text-sm text-gray-500">
                  Catégorie: {produit.categorie}
                </span>
                {produit.reference && (
                  <span className="text-sm text-gray-500">
                    Réf: {produit.reference}
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {shopService.formatPrice(shopService.getPrixAffichage(produit))}
              </div>
              {produit.prixPromo && produit.prixPromo < produit.prix && (
                <div className="text-sm text-gray-500 line-through">
                  {shopService.formatPrice(produit.prix)}
                </div>
              )}
              <div className="text-sm text-gray-600 mt-1">
                Stock: {produit.stock} / Min: {produit.stockMin}
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b">
          <nav className="flex space-x-8">
            {[
              { key: 'details', label: 'Détails', icon: Package },
              { key: 'mouvements', label: 'Historique stock', icon: History }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="min-h-[300px]">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations générales */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Informations générales</h3>
                
                <div className="space-y-3">
                  {produit.marque && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Marque: {produit.marque}</span>
                    </div>
                  )}
                  
                  {produit.codeBarres && (
                    <div className="flex items-center gap-2">
                      <Barcode className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Code-barres: {produit.codeBarres}</span>
                    </div>
                  )}
                  
                  {produit.poids && (
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Poids: {produit.poids} kg</span>
                    </div>
                  )}
                  
                  {produit.dimensions && (
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        Dimensions: {produit.dimensions.longueur} × {produit.dimensions.largeur} × {produit.dimensions.hauteur} {produit.dimensions.unite}
                      </span>
                    </div>
                  )}
                </div>
                
                {produit.tags && produit.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {produit.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fournisseur et métadonnées */}
              <div className="space-y-4">
                {produit.fournisseur && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Fournisseur</h3>
                    <div className="bg-gray-50 p-3 rounded-md space-y-2">
                      <div className="font-medium">{produit.fournisseur.nom}</div>
                      {produit.fournisseur.contact && (
                        <div className="text-sm text-gray-600">Contact: {produit.fournisseur.contact}</div>
                      )}
                      {produit.fournisseur.telephone && (
                        <div className="text-sm text-gray-600">Tél: {produit.fournisseur.telephone}</div>
                      )}
                      {produit.fournisseur.email && (
                        <div className="text-sm text-gray-600">Email: {produit.fournisseur.email}</div>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Métadonnées</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Créé le {new Date(produit.dateCreation).toLocaleDateString('fr-FR')}</span>
                    </div>
                    
                    {produit.creeParUtilisateurId && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Par {produit.creeParUtilisateurId.nom} {produit.creeParUtilisateurId.prenom}</span>
                      </div>
                    )}
                    
                    <div>
                      <span>Valeur stock: {shopService.formatPrice(produit.stock * produit.prix)}</span>
                    </div>
                  </div>
                </div>
                
                {produit.notes && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {produit.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'mouvements' && (
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Historique des mouvements de stock</h3>
              
              {mouvements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun mouvement de stock enregistré
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {mouvements.map((mouvement) => (
                    <div key={mouvement._id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTypeMovementIcon(mouvement.type)}
                          <div>
                            <div className="font-medium text-sm">
                              {mouvement.type} - {mouvement.quantite} unités
                            </div>
                            <div className="text-xs text-gray-500">
                              Stock: {mouvement.stockAvant} → {mouvement.stockApres}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right text-xs text-gray-500">
                          <div>{new Date(mouvement.dateEvenement).toLocaleDateString('fr-FR')}</div>
                          <div>{new Date(mouvement.dateEvenement).toLocaleTimeString('fr-FR')}</div>
                        </div>
                      </div>
                      
                      {mouvement.motif && (
                        <div className="mt-2 text-sm text-gray-600">
                          Motif: {mouvement.motif}
                        </div>
                      )}
                      
                      {mouvement.notes && (
                        <div className="mt-1 text-xs text-gray-500">
                          {mouvement.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}