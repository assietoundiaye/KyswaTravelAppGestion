import { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Package, AlertTriangle, 
  Edit2, Trash2, Eye, BarChart3, TrendingUp, TrendingDown, CreditCard,
  ShoppingCart, Users, DollarSign, Archive
} from 'lucide-react';
// DashboardLayout is provided by the parent route; avoid double rendering
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';
import ProduitModal from './ProduitModal';
import StockAdjustmentModal from './StockAdjustmentModal';
import ProductDetailModal from './ProductDetailModal';
import ShopOrderModal from './ShopOrderModal';
import OrdersManagement from './OrdersManagement';
import shopService from '../../../services/shopService';
import { usePermissions } from '../../../hooks/usePermissions';

export default function ShopPage() {
  // Permissions
  const { 
    hasPermission
  } = usePermissions();

  // Permissions pour le shop
  const canCreateProduct = () => hasPermission('shop', 'create');
  const canUpdateProduct = () => hasPermission('shop', 'edit');
  const canDeleteProduct = () => hasPermission('shop', 'delete');
  const canManageStock = () => hasPermission('shop', 'edit');
  const canViewShop = () => hasPermission('shop', 'view');

  // États principaux
  const [activeTab, setActiveTab] = useState('produits');
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // États pour les modales
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [editingProduit, setEditingProduit] = useState(null);

  // États pour la recherche et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    categorie: 'TOUTES',
    statut: 'TOUS'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });

  // États pour les statistiques
  const [statistiques, setStatistiques] = useState(null);
  const [categories, setCategories] = useState([]);

  const isReadOnly = !canCreateProduct() && !canUpdateProduct() && !canDeleteProduct();

  // Chargement initial
  useEffect(() => {
    loadInitialData();
  }, []);

  // Rechargement lors des changements de filtres/recherche (seulement pour l'onglet produits)
  useEffect(() => {
    if (activeTab === 'produits') {
      loadProduits();
    }
  }, [searchTerm, filters, pagination.currentPage, activeTab]);
  const loadInitialData = async () => {
    try {
      const [categoriesData, statsData] = await Promise.all([
        shopService.getCategories(),
        shopService.getStatistiques()
      ]);
      
      setCategories(categoriesData.categories || []);
      setStatistiques(statsData);
      
      if (activeTab === 'produits') {
        await loadProduits();
      }
    } catch (error) {
      console.error('Erreur chargement données initiales:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadProduits = async () => {
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        search: searchTerm || undefined,
        categorie: filters.categorie !== 'TOUTES' ? filters.categorie : undefined,
        statut: filters.statut !== 'TOUS' ? filters.statut : undefined
      };

      const response = await shopService.getProduits(params);
      setProduits(response.produits || []);
      setPagination(prev => ({
        ...prev,
        ...response.pagination
      }));
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      setError('Erreur lors du chargement des produits');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleCreateProduit = () => {
    setEditingProduit(null);
    setShowModal(true);
  };

  const handleEditProduit = (produit) => {
    setEditingProduit(produit);
    setShowModal(true);
  };
  const handleDeleteProduit = (produit) => {
    setSelectedProduit(produit);
    setShowConfirmDelete(true);
  };

  const handleViewProduit = (produit) => {
    setSelectedProduit(produit);
    setShowDetailModal(true);
  };

  const handleStockAdjustment = (produit) => {
    setSelectedProduit(produit);
    setShowStockModal(true);
  };

  const confirmDelete = async () => {
    if (!canDeleteProduct()) {
      toast('Vous n\'avez pas les permissions pour supprimer des produits', 'error');
      return;
    }

    try {
      setLoading(true);
      await shopService.deleteProduit(selectedProduit._id);
      toast('Produit supprimé avec succès', 'success');
      
      // Recharger la liste des produits
      await loadProduits();
      
      // Recharger les statistiques si affichées
      if (activeTab === 'produits') {
        await loadInitialData();
      }
    } catch (error) {
      console.error('Erreur suppression produit:', error);
      const errorMessage = error.response?.data?.message || 
        error.message || 
        'Erreur lors de la suppression du produit';
      toast(errorMessage, 'error');
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
      setSelectedProduit(null);
    }
  };

  const handleModalSuccess = () => {
    loadProduits();
    loadInitialData(); // Recharger les stats
  };

  const handleCreateOrder = () => {
    // Filtrer les produits actifs avec du stock
    const produitsDisponibles = produits.filter(p => 
      p.statut === 'ACTIF' && p.stock > 0
    );
    
    if (produitsDisponibles.length === 0) {
      toast('Aucun produit disponible pour créer une commande', 'warning');
      return;
    }
    
    setShowOrderModal(true);
  };

  // Rendu des statistiques
  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total produits</p>
            <p className="text-2xl font-bold text-gray-900">
              {statistiques?.totalProduits || 0}
            </p>
          </div>
          <Package className="h-8 w-8 text-blue-600" />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Valeur du stock</p>
            <p className="text-2xl font-bold text-gray-900">
              {shopService.formatPrice(statistiques?.valeurTotaleStock || 0)}
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Produits actifs</p>
            <p className="text-2xl font-bold text-gray-900">
              {statistiques?.produitsActifs || 0}
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Ruptures de stock</p>
            <p className="text-2xl font-bold text-red-600">
              {statistiques?.ruptureStock || 0}
            </p>
          </div>
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode lecture seule */}
      {isReadOnly && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-800">Mode consultation</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Vous avez un accès en lecture seule au module Shop. Les modifications ne sont pas autorisées.
          </p>
        </div>
      )}
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kyswa Shop</h1>
          <p className="text-gray-600 mt-1">
            Gestion des produits et des ventes
          </p>
        </div>

        {!isReadOnly && (
          <div className="flex gap-3">
            <button
              onClick={handleCreateOrder}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Nouvelle commande
            </button>
            <button
              onClick={handleCreateProduit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouveau produit
            </button>
          </div>
        )}
      </div>

      {/* Statistiques */}
      {renderStats()}

      {/* Onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'produits', label: 'Produits', icon: Package, count: statistiques?.totalProduits },
            { key: 'commandes', label: 'Commandes', icon: ShoppingCart, count: statistiques?.commandesMois }
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {count !== undefined && (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
      {/* Contenu des onglets */}
      <div className="min-h-[500px]">
        {activeTab === 'produits' ? (
          <div className="space-y-6">
            {/* Filtres et recherche */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Barre de recherche */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un produit..."
                      value={searchTerm}
                      onChange={handleSearch}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Filtres */}
                <div className="flex gap-3">
                  <select
                    value={filters.categorie}
                    onChange={(e) => handleFilterChange('categorie', e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="TOUTES">Toutes les catégories</option>
                    {shopService.getCategoriesOptions().filter(cat => cat.value !== 'TOUTES').map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>

                  <select
                    value={filters.statut}
                    onChange={(e) => handleFilterChange('statut', e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="TOUS">Tous les statuts</option>
                    {shopService.getStatutsOptions().filter(status => status.value !== 'TOUS').map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {/* Liste des produits */}
            <div className="bg-white rounded-lg shadow">
              {produits.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || filters.categorie !== 'TOUTES' || filters.statut !== 'TOUS'
                      ? 'Aucun produit ne correspond à vos critères'
                      : 'Commencez par ajouter votre premier produit'
                    }
                  </p>
                  {!isReadOnly && (
                    <button
                      onClick={handleCreateProduit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Ajouter un produit
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Table des produits */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Produit</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Catégorie</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Prix</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Stock</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Statut</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {produits.map((produit) => {
                          const isRupture = shopService.isRuptureStock(produit);
                          const status = shopService.getProductStatus(produit);
                          
                          return (
                            <tr key={produit._id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{produit.nom}</div>
                                    {produit.description && (
                                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                                        {produit.description}
                                      </div>
                                    )}
                                    {produit.reference && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        Réf: {produit.reference}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-sm text-gray-600">
                                  {produit.categorie}
                                </span>
                              </td>

                              <td className="py-4 px-4">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {shopService.formatPrice(shopService.getPrixAffichage(produit))}
                                  </div>
                                  {produit.prixPromo && produit.prixPromo < produit.prix && (
                                    <div className="text-sm text-gray-500 line-through">
                                      {shopService.formatPrice(produit.prix)}
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${isRupture ? 'text-red-600' : 'text-gray-900'}`}>
                                    {produit.stock}
                                  </span>
                                  {isRupture && (
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Min: {produit.stockMin}
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  status.color === 'green' ? 'bg-green-100 text-green-800' :
                                  status.color === 'red' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {status.text}
                                </span>
                              </td>

                              <td className="py-4 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleViewProduit(produit)}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Voir les détails"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  {!isReadOnly && (
                                    <>
                                      {canUpdateProduct() && (
                                        <button
                                          onClick={() => handleEditProduit(produit)}
                                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                          title="Modifier"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </button>
                                      )}

                                      {canManageStock() && (
                                        <button
                                          onClick={() => handleStockAdjustment(produit)}
                                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                          title="Ajuster le stock"
                                        >
                                          <BarChart3 className="h-4 w-4" />
                                        </button>
                                      )}

                                      {canDeleteProduct() && (
                                        <button
                                          onClick={() => handleDeleteProduit(produit)}
                                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                          title="Supprimer"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Affichage de {Math.min((pagination.currentPage - 1) * pagination.itemsPerPage + 1, pagination.totalItems)} à{' '}
                        {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} sur {pagination.totalItems} produits
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                          disabled={pagination.currentPage === 1}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Précédent
                        </button>

                        <span className="px-3 py-1 text-sm">
                          Page {pagination.currentPage} sur {pagination.totalPages}
                        </span>

                        <button
                          onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                          disabled={pagination.currentPage === pagination.totalPages}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <OrdersManagement />
        )}
      </div>

      {/* Modales */}
      {showModal && (
        <ProduitModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          produit={editingProduit}
          onSuccess={handleModalSuccess}
        />
      )}

      {showStockModal && (
        <StockAdjustmentModal
          isOpen={showStockModal}
          onClose={() => setShowStockModal(false)}
          produit={selectedProduit}
          onSuccess={handleModalSuccess}
        />
      )}
      {showDetailModal && (
        <ProductDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          produitId={selectedProduit?._id}
        />
      )}

      {showOrderModal && (
        <ShopOrderModal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          produits={produits.filter(p => p.statut === 'ACTIF' && p.stock > 0)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showConfirmDelete && (
        <ConfirmDialog
          isOpen={showConfirmDelete}
          onClose={() => setShowConfirmDelete(false)}
          onConfirm={confirmDelete}
          title="Supprimer le produit"
          message={`Êtes-vous sûr de vouloir supprimer "${selectedProduit?.nom}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
}