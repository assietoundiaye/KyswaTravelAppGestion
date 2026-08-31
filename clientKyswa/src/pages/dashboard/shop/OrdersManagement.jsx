import { useState, useEffect } from 'react';
import { 
  Search, Filter, Eye, CreditCard, Package, Calendar,
  User, Clock, CheckCircle, XCircle, AlertCircle, Trash2, Download, X
} from 'lucide-react';
import ShopPaymentModal from './ShopPaymentModal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Pagination from '../../../components/Pagination';
import shopService from '../../../services/shopService';
import { toast } from '../../../components/Toast';
import { usePermissions } from '../../../hooks/usePermissions';

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TOUS');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeletePaymentConfirm, setShowDeletePaymentConfirm] = useState(false);
  const [deletePaymentMotif, setDeletePaymentMotif] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });

  const { canCreateProduct, canDeletePayment, canDeleteOrder } = usePermissions();

  const [showDeleteOrderConfirm, setShowDeleteOrderConfirm] = useState(false);
  const [deleteOrderMotif, setDeleteOrderMotif] = useState('');

  useEffect(() => {
    loadOrders();
  }, [searchTerm, statusFilter, pagination.currentPage]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        status: statusFilter !== 'TOUS' ? statusFilter : undefined,
        search: searchTerm || undefined
      };

      const response = await shopService.getCommandes(params);
      setOrders(response.orders || []);
      setPagination(prev => ({
        ...prev,
        ...response.pagination
      }));
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
      toast('Erreur lors du chargement des commandes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'EN_ATTENTE_PAIEMENT':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'PAYE':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ANNULEE':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'EN_ATTENTE_PAIEMENT': 'En attente',
      'PAYE': 'Payée',
      'ANNULEE': 'Annulée'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'EN_ATTENTE_PAIEMENT': 'bg-orange-100 text-orange-800',
      'PAYE': 'bg-green-100 text-green-800',
      'ANNULEE': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handlePayOrder = (order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedOrder(null);
    loadOrders();
  };

  const handleDeleteOrder = (order) => {
    setSelectedOrder(order);
    setDeleteOrderMotif('');
    setShowDeleteOrderConfirm(true);
  };

  const confirmDeleteOrder = async () => {
    if (!selectedOrder) return;

    try {
      await shopService.deleteCommande(selectedOrder._id, deleteOrderMotif);
      toast('Commande supprimée avec succès', 'success');
      setShowDeleteOrderConfirm(false);
      setSelectedOrder(null);
      setDeleteOrderMotif('');
      loadOrders();
    } catch (error) {
      console.error('Erreur suppression commande:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la suppression de la commande';
      toast(errorMessage, 'error');
    }
  };

  const handleDeletePayment = (order) => {
    setSelectedOrder(order);
    setDeletePaymentMotif('');
    setShowDeletePaymentConfirm(true);
  };

  const confirmDeletePayment = async () => {
    if (!selectedOrder) return;

    try {
      await shopService.supprimerPaiementCommande(selectedOrder._id, deletePaymentMotif);
      toast('Paiement supprimé avec succès', 'success');
      setShowDeletePaymentConfirm(false);
      setSelectedOrder(null);
      setDeletePaymentMotif('');
      loadOrders();
    } catch (error) {
      console.error('Erreur suppression paiement:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors de la suppression du paiement';
      toast(errorMessage, 'error');
    }
  };

  const handleDownloadInvoice = async (order) => {
    try {
      const blob = await shopService.telechargerFactureCommande(order._id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${order.orderNumber || order._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast('Facture téléchargée avec succès', 'success');
    } catch (error) {
      console.error('Erreur téléchargement facture:', error);
      const errorMessage = error.response?.data?.message || 'Erreur lors du téléchargement de la facture';
      toast(errorMessage, 'error');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des commandes</h2>
          <p className="text-gray-600">
            Suivi et traitement des commandes shop
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro, client..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtre par statut */}
          <div className="flex gap-2">
            {[
              { key: 'TOUS', label: 'Tous', count: orders.length },
              { key: 'EN_ATTENTE_PAIEMENT', label: 'En attente' },
              { key: 'PAYE', label: 'Payées' },
              { key: 'ANNULEE', label: 'Annulées' }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => handleStatusFilter(filter.key)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === filter.key
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des commandes */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune commande trouvée</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'TOUS'
                ? 'Aucune commande ne correspond à vos critères'
                : 'Aucune commande enregistrée pour le moment'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Table des commandes */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Commande</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Articles</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Total</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Statut</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-mono text-sm font-medium">
                          {order.orderNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {order._id.slice(-8)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {order.clientId?.nom} {order.clientId?.prenom}
                            </div>
                            {order.clientId?.email && (
                              <div className="text-xs text-gray-500">
                                {order.clientId.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-sm">
                          {order.items?.length} produit{order.items?.length > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.items?.reduce((total, item) => total + item.quantite, 0)} unités
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">
                          {shopService.formatPrice(order.montantTotal)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {/* TODO: Voir détails */}}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDownloadInvoice(order)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Télécharger la facture"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {order.status === 'EN_ATTENTE_PAIEMENT' && canCreateProduct() && (
                            <button
                              onClick={() => handlePayOrder(order)}
                              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                              title="Encaisser le paiement"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                          )}

                          {/* Bouton d'annulation de paiement */}
                          {order.status === 'PAYE' && canDeletePayment() && (
                            <button
                              onClick={() => handleDeletePayment(order)}
                              className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded transition-colors border border-red-200"
                              title="Supprimer le paiement"
                              style={{ minWidth: '28px', minHeight: '28px' }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Bouton de suppression de commande */}
                          {canDeleteOrder() && (
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="p-1 text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 rounded transition-colors border border-red-300"
                              title="Supprimer la commande"
                              style={{ minWidth: '28px', minHeight: '28px' }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination unifiée */}
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              itemsPerPage={pagination.itemsPerPage}
              onPageChange={(page) => setPagination(prev => ({ ...prev, currentPage: page }))}
              onLimitChange={(limit) => setPagination(prev => ({ ...prev, itemsPerPage: limit, currentPage: 1 }))}
            />
          </>
        )}
      </div>

      {/* Modal de paiement */}
      {showPaymentModal && (
        <ShopPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          order={selectedOrder}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Modal de confirmation de suppression de paiement */}
      {showDeletePaymentConfirm && (
        <ConfirmDialog
          isOpen={showDeletePaymentConfirm}
          onClose={() => {
            setShowDeletePaymentConfirm(false);
            setSelectedOrder(null);
            setDeletePaymentMotif('');
          }}
          onConfirm={confirmDeletePayment}
          title="Supprimer le paiement"
          confirmText="Supprimer le paiement"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer le paiement de la commande <strong>{selectedOrder?.orderNumber}</strong> ?
            </p>
            <p className="text-sm text-gray-500">
              Cette action va :
            </p>
            <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
              <li>Remettre la commande en attente de paiement</li>
              <li>Restaurer le stock des produits vendus</li>
              <li>Supprimer l'enregistrement du paiement</li>
            </ul>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motif de suppression (optionnel)
              </label>
              <textarea
                value={deletePaymentMotif}
                onChange={(e) => setDeletePaymentMotif(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Expliquez la raison de la suppression..."
              />
            </div>
          </div>
        </ConfirmDialog>
      )}
      {/* Modal de confirmation de suppression de commande */}
      {showDeleteOrderConfirm && (
        <ConfirmDialog
          isOpen={showDeleteOrderConfirm}
          onClose={() => {
            setShowDeleteOrderConfirm(false);
            setSelectedOrder(null);
            setDeleteOrderMotif('');
          }}
          onConfirm={confirmDeleteOrder}
          title="Supprimer la commande"
          confirmText="Supprimer définitivement"
          confirmButtonClass="bg-red-700 hover:bg-red-800"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              ⚠️ Êtes-vous sûr de vouloir supprimer définitivement la commande <strong>{selectedOrder?.orderNumber}</strong> ?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm font-medium text-red-800 mb-2">⚠️ Action réservée aux Admins et Commerciaux - Cette action est irréversible et va :</p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>Supprimer la commande définitivement</li>
                <li>Restaurer le stock des produits (si payée)</li>
                <li>Supprimer le paiement associé (si payée)</li>
                <li>Perdre tout l'historique de cette commande</li>
              </ul>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motif de suppression (optionnel)
              </label>
              <textarea
                value={deleteOrderMotif}
                onChange={(e) => setDeleteOrderMotif(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows="3"
                placeholder="Expliquez la raison de la suppression (facultatif)..."
              />
            </div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}