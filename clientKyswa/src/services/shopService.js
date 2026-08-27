import api from '../core/api/axios';

const API_BASE = '/shop';

/**
 * Service pour la gestion des produits du shop
 */
class ShopService {
  normalizeResponse(response) {
    return response?.data?.data ?? response?.data;
  }
  
  // ── Gestion des produits ──────────────────────────────────────────────────
  
  /**
   * Récupérer tous les produits avec filtres et pagination
   */
  async getProduits(params = {}) {
    const response = await api.get(`${API_BASE}/produits`, { params });
    return this.normalizeResponse(response);
  }

  /**
   * Récupérer un produit par ID
   */
  async getProduitById(id) {
    const response = await api.get(`${API_BASE}/produits/${id}`);
    return this.normalizeResponse(response);
  }

  /**
   * Créer un nouveau produit
   */
  async createProduit(produitData) {
    const response = await api.post(`${API_BASE}/produits`, produitData);
    return this.normalizeResponse(response);
  }

  /**
   * Mettre à jour un produit
   */
  async updateProduit(id, produitData) {
    const response = await api.patch(`${API_BASE}/produits/${id}`, produitData);
    return this.normalizeResponse(response);
  }

  /**
   * Supprimer un produit
   */
  async deleteProduit(id) {
    const response = await api.delete(`${API_BASE}/produits/${id}`);
    return this.normalizeResponse(response);
  }

  /**
   * Supprimer TOUS les produits (opération destructive)
   */
  async deleteAllProduits() {
    const response = await api.delete(`${API_BASE}/produits`);
    return this.normalizeResponse(response);
  }

  // ── Utilitaires pour l'affichage ─────────────────────────────────────────

  /**
   * Obtenir le prix d'affichage d'un produit (promo ou normal)
   */
  getPrixAffichage(produit) {
    if (produit.prixPromo && produit.prixPromo > 0) {
      return parseFloat(produit.prixPromo);
    }
    return parseFloat(produit.prix || 0);
  }

  /**
   * Formater un prix pour l'affichage
   */
  formatPrice(prix) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(prix);
  }

  /**
   * Vérifier si un produit est en promotion
   */
  isOnPromo(produit) {
    return produit.prixPromo && produit.prixPromo > 0 && produit.prixPromo < produit.prix;
  }

  // ── Gestion du stock ──────────────────────────────────────────────────────
  
  /**
   * Ajuster le stock d'un produit
   */
  async ajusterStock(id, { quantite, type, motif, notes, referenceExterne, documentSource }) {
    const response = await api.post(`${API_BASE}/produits/${id}/ajuster-stock`, {
      quantite,
      type,
      motif,
      notes,
      referenceExterne,
      documentSource
    });
    return this.normalizeResponse(response);
  }

  // ── Historique et traçabilité ─────────────────────────────────────────────

  /**
   * Récupérer l'historique des mouvements de stock d'un produit
   */
  async getHistoriqueMouvements(produitId, params = {}) {
    const response = await api.get(`${API_BASE}/produits/${produitId}/mouvements`, { params });
    return this.normalizeResponse(response);
  }

  /**
   * Créer une commande shop
   */
  async createCommande(commandeData) {
    const response = await api.post(`${API_BASE}/commandes`, commandeData);
    return this.normalizeResponse(response);
  }

  /**
   * Lister les commandes shop
   */
  async getCommandes(params = {}) {
    const response = await api.get(`${API_BASE}/commandes`, { params });
    return this.normalizeResponse(response);
  }

  /**
   * Valider le paiement d'une commande shop
   */
  async validerPaiementCommande(orderId, paiementData) {
    const response = await api.post(`${API_BASE}/commandes/${orderId}/payer`, paiementData);
    return this.normalizeResponse(response);
  }

  /**
   * Supprimer le paiement d'une commande shop
   */
  async supprimerPaiementCommande(orderId, motif = '') {
    const response = await api.delete(`${API_BASE}/commandes/${orderId}/paiement`, {
      data: { motif }
    });
    return this.normalizeResponse(response);
  }

  /**
   * Télécharger la facture d'une commande shop
   */
  async telechargerFactureCommande(orderId) {
    const response = await api.get(`/factures/shop/${orderId}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Mettre à jour une commande
   */
  async updateCommande(id, commandeData) {
    const response = await api.patch(`${API_BASE}/commandes/${id}`, commandeData);
    return this.normalizeResponse(response);
  }

  /**
   * Annuler/Supprimer une commande
   */
  async deleteCommande(id, motif = '') {
    const response = await api.delete(`${API_BASE}/commandes/${id}`, {
      data: { motif }
    });
    return this.normalizeResponse(response);
  }

  /**
   * Récupérer une commande par ID
   */
  async getCommandeById(id) {
    const response = await api.get(`${API_BASE}/commandes/${id}`);
    return this.normalizeResponse(response);
  }

  // ── Statistiques et rapports ──────────────────────────────────────────────
  
  /**
   * Récupérer les statistiques du shop
   */
  async getStatistiques() {
    const response = await api.get(`${API_BASE}/statistiques`);
    return this.normalizeStatistiques(this.normalizeResponse(response));
  }

  normalizeStatistiques(data) {
    const stats = data?.statistiquesGenerales || data || {};

    return {
      totalProduits: stats.totalProduits ?? 0,
      valeurTotaleStock: this.toNumber(stats.valeurTotaleStock ?? data?.valeurTotaleStock),
      produitsActifs: stats.produitsActifs ?? 0,
      ruptureStock: stats.produitsRupture ?? stats.ruptureStock ?? 0,
      commandesMois: data?.commandesMois ?? stats.commandesMois ?? 0,
      statistiquesParCategorie: data?.statistiquesParCategorie ?? [],
      alertesStock: data?.alertesStock ?? [],
    };
  }

  toNumber(value) {
    if (value == null) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === 'object') {
      if (value.$numberDecimal != null) {
        const parsed = parseFloat(value.$numberDecimal);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      if (typeof value.toString === 'function') {
        const parsed = parseFloat(value.toString());
        return Number.isFinite(parsed) ? parsed : 0;
      }
    }
    return 0;
  }

  /**
   * Récupérer les catégories disponibles
   */
  async getCategories() {
    const response = await api.get(`${API_BASE}/categories`);
    return this.normalizeResponse(response);
  }

  /**
   * Récupérer l'historique des mouvements de stock d'un produit
   */
  async getMouvementsStock(produitId, params = {}) {
    const response = await api.get(`${API_BASE}/produits/${produitId}/mouvements`, { params });
    return this.normalizeResponse(response);
  }

  /**
   * Générer un rapport d'ajustements par période
   */
  async getRapportMouvements(params = {}) {
    const response = await api.get(`${API_BASE}/mouvements/rapport`, { params });
    return this.normalizeResponse(response);
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────

  /**
   * Formater le prix en FCFA
   */
  formatPrice(price) {
    if (!price && price !== 0) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

  /**
   * Calculer le prix d'affichage (promo ou normal)
   */
  getPrixAffichage(produit) {
    const prix = this.toNumber(produit?.prix);
    const prixPromo = this.toNumber(produit?.prixPromo);
    return prixPromo > 0 && prixPromo < prix ? prixPromo : prix;
  }

  /**
   * Vérifier si un produit est en rupture de stock
   */
  isRuptureStock(produit) {
    return produit.stock <= (produit.stockMin || 0);
  }

  /**
   * Obtenir le statut d'affichage d'un produit
   */
  getProductStatus(produit) {
    if (produit.statut === 'INACTIF') return { text: 'Inactif', color: 'gray' };
    if (produit.statut === 'ARCHIVE') return { text: 'Archivé', color: 'gray' };
    if (this.isRuptureStock(produit)) return { text: 'Rupture', color: 'red' };
    return { text: 'Disponible', color: 'green' };
  }

  /**
   * Valider les données d'un produit avant envoi
   */
  validateProduitData(data) {
    const errors = [];
    
    if (!data.nom?.trim()) errors.push('Le nom est requis');
    if (!data.categorie) errors.push('La catégorie est requise');
    if (!data.prix || data.prix <= 0) errors.push('Le prix doit être positif');
    
    if (data.stock < 0) errors.push('Le stock ne peut pas être négatif');
    if (data.stockMin < 0) errors.push('Le stock minimum ne peut pas être négatif');
    
    if (data.prixPromo && data.prixPromo >= data.prix) {
      errors.push('Le prix promotionnel doit être inférieur au prix normal');
    }
    
    return errors;
  }

  /**
   * Valider les données d'une commande avant envoi
   */
  validateCommandeData(data) {
    const errors = [];
    
    if (!data.clientId) errors.push('Le client est requis');
    if (!Array.isArray(data.items) || data.items.length === 0) {
      errors.push('Au moins un article est requis');
    }
    
    data.items.forEach((item, index) => {
      if (!item.produitId) errors.push(`Produit requis pour l'article ${index + 1}`);
      if (!item.quantite || item.quantite <= 0) {
        errors.push(`Quantité invalide pour l'article ${index + 1}`);
      }
    });
    
    return errors;
  }

  /**
   * Calculer le montant total d'une commande
   */
  calculateCommandeTotal(items, produits) {
    return items.reduce((total, item) => {
      const produit = produits.find(p => p._id === item.produitId);
      if (!produit) return total;
      
      const prix = this.getPrixAffichage(produit);
      return total + (prix * item.quantite);
    }, 0);
  }

  /**
  async confirmerPaiementCommande(id, paiementData) {
    const response = await api.post(`${API_BASE}/commandes/${id}/payer`, paiementData);
    return this.normalizeResponse(response);
  }

  /**
   * Récupérer le rapport d'ajustements par période
   */
  async getRapportMouvements(dateDebut, dateFin, produitId = null) {
    const params = { dateDebut, dateFin };
    if (produitId) params.produitId = produitId;
    const response = await api.get(`${API_BASE}/mouvements/rapport`, { params });
    return response.data;
  }

  // ── Statistiques et rapports ──────────────────────────────────────────────
  
  /**
   * Récupérer les statistiques du shop
   */
  async getStatistiques() {
    const response = await api.get(`${API_BASE}/statistiques`);
    return this.normalizeStatistiques(this.normalizeResponse(response));
  }

  // ── Configuration ─────────────────────────────────────────────────────────
  
  /**
   * Récupérer les catégories disponibles
   */
  async getCategories() {
    const response = await api.get(`${API_BASE}/categories`);
    return this.normalizeResponse(response);
  }

  // ── Méthodes utilitaires ──────────────────────────────────────────────────
  
  /**
   * Rechercher des produits
   */
  async rechercherProduits(terme, filtres = {}) {
    return this.getProduits({
      search: terme,
      ...filtres
    });
  }

  /**
   * Récupérer les produits en rupture de stock
   */
  async getProduitsRuptureStock() {
    return this.getProduits({
      statut: 'RUPTURE_STOCK'
    });
  }

  /**
   * Récupérer les produits par catégorie
   */
  async getProduitsByCategorie(categorie) {
    return this.getProduits({
      categorie
    });
  }

  /**
   * Valider les données d'un produit
   */
  validateProduitData(data) {
    const errors = [];

    if (!data.nom || data.nom.trim().length < 2) {
      errors.push('Le nom du produit est requis (minimum 2 caractères)');
    }

    if (!data.prix || data.prix <= 0) {
      errors.push('Le prix doit être supérieur à 0');
    }

    if (!data.categorie) {
      errors.push('La catégorie est requise');
    }

    if (data.stock !== undefined && data.stock < 0) {
      errors.push('Le stock ne peut pas être négatif');
    }

    if (data.stockMin !== undefined && data.stockMin < 0) {
      errors.push('Le stock minimum ne peut pas être négatif');
    }

    if (data.prixPromo && data.prixPromo >= data.prix) {
      errors.push('Le prix promotionnel doit être inférieur au prix normal');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Formater un prix pour l'affichage
   */
  formatPrice(price) {
    const value = this.toNumber(price);
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(value);
  }

  /**
   * Obtenir le statut d'un produit en français
   */
  getStatutLabel(statut) {
    const labels = {
      'ACTIF': 'Actif',
      'INACTIF': 'Inactif',
      'RUPTURE_STOCK': 'Rupture de stock',
      'ARCHIVE': 'Archivé'
    };
    return labels[statut] || statut;
  }

  /**
   * Obtenir la couleur associée à un statut
   */
  getStatutColor(statut) {
    const colors = {
      'ACTIF': 'green',
      'INACTIF': 'gray',
      'RUPTURE_STOCK': 'red',
      'ARCHIVE': 'purple'
    };
    return colors[statut] || 'gray';
  }

  /**
   * Obtenir le label d'une catégorie
   */
  getCategorieLabel(categorie) {
    const labels = {
      'ALIMENTAIRE': 'Alimentaire',
      'EAU_ZAMZAM': 'Eau de Zamzam',
      'DATTES': 'Dattes',
      'MIEL': 'Miel',
      'ENCENS': 'Encens & Parfums',
      'TAPIS_PRIERE': 'Tapis de Prière',
      'VETEMENTS': 'Vêtements Religieux',
      'LIVRES': 'Livres & Coran',
      'BIJOUX': 'Bijoux Religieux',
      'ACCESSOIRES': 'Accessoires Pèlerinage',
      'SOUVENIRS': 'Souvenirs',
      'AUTRE': 'Autre'
    };
    return labels[categorie] || categorie;
  }

  /**
   * Générer les options pour les select de filtre
   */
  getCategoriesOptions() {
    return [
      { value: 'TOUTES', label: 'Toutes les catégories' },
      { value: 'ALIMENTAIRE', label: 'Alimentaire' },
      { value: 'EAU_ZAMZAM', label: 'Eau de Zamzam' },
      { value: 'DATTES', label: 'Dattes' },
      { value: 'MIEL', label: 'Miel' },
      { value: 'ENCENS', label: 'Encens & Parfums' },
      { value: 'TAPIS_PRIERE', label: 'Tapis de Prière' },
      { value: 'VETEMENTS', label: 'Vêtements Religieux' },
      { value: 'LIVRES', label: 'Livres & Coran' },
      { value: 'BIJOUX', label: 'Bijoux Religieux' },
      { value: 'ACCESSOIRES', label: 'Accessoires Pèlerinage' },
      { value: 'SOUVENIRS', label: 'Souvenirs' },
      { value: 'AUTRE', label: 'Autre' }
    ];
  }

  /**
   * Générer les options pour les statuts
   */
  getStatutsOptions() {
    return [
      { value: 'TOUS', label: 'Tous les statuts' },
      { value: 'ACTIF', label: 'Actif' },
      { value: 'INACTIF', label: 'Inactif' },
      { value: 'RUPTURE_STOCK', label: 'Rupture de stock' },
      { value: 'ARCHIVE', label: 'Archivé' }
    ];
  }

  /**
   * Générer les options pour les modes de paiement
   */
  getModesPaymentOptions() {
    return [
      { value: 'ESPECES', label: 'Espèces' },
      { value: 'CARTE_BANCAIRE', label: 'Carte bancaire' },
      { value: 'VIREMENT', label: 'Virement bancaire' },
      { value: 'CHEQUE', label: 'Chèque' },
      { value: 'MOBILE_MONEY', label: 'Mobile Money' }
    ];
  }

  /**
   * Générer les options pour les types d'ajustement stock
   */
  getTypesAjustementOptions() {
    return [
      { value: 'AJOUT', label: 'Ajout au stock', description: 'Ajouter à la quantité existante' },
      { value: 'RETRAIT', label: 'Retrait du stock', description: 'Retirer de la quantité existante' },
      { value: 'SET', label: 'Définir le stock', description: 'Fixer une nouvelle quantité' }
    ];
  }

  /**
   * Générer les options pour les motifs d'ajustement
   */
  getMotifsAjustementOptions() {
    return [
      { value: 'VENTE', label: 'Vente' },
      { value: 'ACHAT_FOURNISSEUR', label: 'Achat fournisseur' },
      { value: 'RETOUR_CLIENT', label: 'Retour client' },
      { value: 'CASSE', label: 'Casse/Détérioration' },
      { value: 'PERTE', label: 'Perte' },
      { value: 'INVENTAIRE_CORRECTION', label: 'Correction inventaire' },
      { value: 'TRANSFERT_MAGASIN', label: 'Transfert magasin' },
      { value: 'AJUSTEMENT_COMPTABLE', label: 'Ajustement comptable' },
      { value: 'AUTRE', label: 'Autre' }
    ];
  }
}

export default new ShopService();