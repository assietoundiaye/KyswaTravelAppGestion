/**
 * @fileoverview Service pour le module Shop
 * Logique métier et validation
 */

const { ValidationException, BusinessException } = require('../../../shared/exceptions');

class ShopService {
  constructor(shopRepository, auditService) {
    this.repository = shopRepository;
    this.audit = auditService;
  }

  // ── Gestion des produits ──────────────────────────────────────────────────

  /**
   * Obtenir tous les produits avec filtres
   */
  async getProduits(filters) {
    try {
      return await this.repository.getProduits(filters);
    } catch (error) {
      if (error.message.includes('MongoDB non connecté')) {
        // Retourner des données vides avec un message informatif
        return {
          produits: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: 20
          },
          message: 'Module Shop temporairement indisponible (MongoDB non connecté)'
        };
      }
      throw new BusinessException('Erreur lors de la récupération des produits', error);
    }
  }

  /**
   * Obtenir un produit par ID
   */
  async getProduitById(id) {
    if (!id) {
      throw new ValidationException('ID du produit requis');
    }

    const produit = await this.repository.getProduitById(id);
    if (!produit) {
      throw new BusinessException('Produit non trouvé');
    }

    return produit;
  }

  /**
   * Créer un nouveau produit
   */
  async createProduit(data, userId) {
    // Validation des données
    const validatedData = this.validateProduitData(data);

    const produit = await this.repository.createProduit({
      ...validatedData,
      cree_par_user_id: userId, // Champ correct pour PostgreSQL
      created_at: new Date(),
      updated_at: new Date()
    });

    // Audit
    await this.audit?.log(userId, 'CREATE', 'shop', {
      produitId: produit.id, // Utiliser 'id' au lieu de '_id'
      nom: produit.nom,
      prix: produit.prix
    });

    return produit;
  }

  /**
   * Mettre à jour un produit
   */
  async updateProduit(id, data, userId) {
    await this.getProduitById(id); // Vérifier que le produit existe
    const validatedData = this.validateProduitData(data, false);

    const updatedProduit = await this.repository.updateProduit(id, {
      ...validatedData,
      updated_at: new Date()
    });

    // Audit
    await this.audit?.log(userId, 'UPDATE', 'shop', {
      produitId: id,
      changes: validatedData
    });

    return updatedProduit;
  }

  /**
   * Supprimer un produit
   */
  async deleteProduit(id, userId) {
    const produit = await this.getProduitById(id);

    // Vérifier qu'il n'est pas utilisé dans des commandes
    // Cette vérification sera faite dans le repository si nécessaire

    await this.repository.deleteProduit(id);

    // Audit
    await this.audit?.log(userId, 'DELETE', 'shop', {
      produitId: id,
      nom: produit.nom
    });

    return { success: true };
  }

  /**
   * Supprimer tous les produits
   */
  async deleteAllProduits(userId) {
    const result = await this.repository.deleteAllProduits();

    // Audit
    await this.audit?.log(userId, 'DELETE_ALL', 'shop', {
      count: result.deletedCount
    });

    return result;
  }

  // ── Gestion du stock ──────────────────────────────────────────────────────

  /**
   * Ajuster le stock d'un produit
   */
  async ajusterStock(produitId, adjustmentData, userId) {
    const validatedAdjustment = this.validateStockAdjustment(adjustmentData);

    const result = await this.repository.ajusterStock(produitId, validatedAdjustment, userId);

    // Audit
    await this.audit?.log(userId, 'STOCK_ADJUSTMENT', 'shop', {
      produitId,
      type: validatedAdjustment.type,
      quantite: validatedAdjustment.quantite,
      motif: validatedAdjustment.motif
    });

    return result;
  }

  /**
   * Obtenir l'historique des mouvements de stock
   */
  async getMouvementsStock(produitId, filters) {
    if (!produitId) {
      throw new ValidationException('ID du produit requis');
    }

    return await this.repository.getMouvementsStock(produitId, filters);
  }

  // ── Statistiques ──────────────────────────────────────────────────────────

  /**
   * Obtenir les statistiques du shop
   */
  async getStatistiques() {
    try {
      return await this.repository.getStatistiques();
    } catch (error) {
      if (error.message.includes('MongoDB non connecté')) {
        return {
          statistiquesGenerales: {
            totalProduits: 0,
            produitsActifs: 0,
            produitsRupture: 0,
            valeurTotaleStock: 0
          },
          commandesMois: 0,
          message: 'Module Shop temporairement indisponible (MongoDB non connecté)'
        };
      }
      throw new BusinessException('Erreur lors de la récupération des statistiques', error);
    }
  }

  /**
   * Obtenir les catégories disponibles
   */
  async getCategories() {
    try {
      return await this.repository.getCategories();
    } catch (error) {
      if (error.message.includes('MongoDB non connecté')) {
        return {
          categories: ['ALIMENTAIRE', 'EAU_ZAMZAM', 'DATTES', 'MIEL', 'ENCENS', 'TAPIS_PRIERE', 'VETEMENTS', 'LIVRES', 'BIJOUX', 'ACCESSOIRES', 'SOUVENIRS', 'AUTRE'],
          message: 'Module Shop temporairement indisponible (MongoDB non connecté)'
        };
      }
      throw new BusinessException('Erreur lors de la récupération des catégories', error);
    }
  }

  // ── Gestion des commandes ─────────────────────────────────────────────────

  /**
   * Créer une nouvelle commande
   */
  async createCommande(commandeData, userId) {
    const validatedData = this.validateCommandeData(commandeData);

    const commande = await this.repository.createCommande({
      ...validatedData,
      cree_par_user_id: userId, // Champ correct pour PostgreSQL
      created_at: new Date(),
      status: 'EN_ATTENTE_PAIEMENT'
    });

    // Audit
    await this.audit?.log(userId, 'CREATE', 'shop_orders', {
      commandeId: commande.id, // Utiliser 'id' au lieu de '_id'
      clientId: commande.client_id,
      montantTotal: commande.montant_total
    });

    return commande;
  }

  /**
   * Obtenir toutes les commandes
   */
  async getCommandes(filters) {
    return await this.repository.getCommandes(filters);
  }

  /**
   * Obtenir une commande par ID
   */
  async getCommandeById(id) {
    if (!id) {
      throw new ValidationException('ID de la commande requis');
    }

    const commande = await this.repository.getCommandeById(id);
    if (!commande) {
      throw new BusinessException('Commande non trouvée');
    }

    return commande;
  }

  /**
   * Mettre à jour une commande
   */
  async updateCommande(id, data, userId) {
    await this.getCommandeById(id); // Vérifier que la commande existe

    const updatedCommande = await this.repository.updateCommande(id, {
      ...data,
      updatedAt: new Date()
    });

    // Audit
    await this.audit?.log(userId, 'UPDATE', 'shop_orders', {
      commandeId: id,
      changes: data
    });

    return updatedCommande;
  }

  /**
   * Supprimer une commande
   */
  async deleteCommande(id, userId) {
    const commande = await this.getCommandeById(id);

    await this.repository.deleteCommande(id);

    // Audit
    await this.audit?.log(userId, 'DELETE', 'shop_orders', {
      commandeId: id,
      clientId: commande.clientId
    });

    return { success: true };
  }

  // ── Validation ────────────────────────────────────────────────────────────

  /**
   * Valider les données d'un produit
   */
  validateProduitData(data, isCreate = true) {
    const errors = [];

    // Nom requis
    if (isCreate && !data.nom?.trim()) {
      errors.push('Le nom du produit est requis');
    }
    if (data.nom && typeof data.nom !== 'string') {
      errors.push('Le nom doit être une chaîne de caractères');
    }

    // Prix requis et positif
    if (isCreate && (data.prix === undefined || data.prix === null)) {
      errors.push('Le prix est requis');
    }
    if (data.prix !== undefined) {
      const prix = parseFloat(data.prix);
      if (isNaN(prix) || prix < 0) {
        errors.push('Le prix doit être un nombre positif');
      }
    }

    // Catégorie requise
    if (isCreate && !data.categorie) {
      errors.push('La catégorie est requise');
    }

    // Stock doit être positif
    if (data.stock !== undefined) {
      const stock = parseInt(data.stock);
      if (isNaN(stock) || stock < 0) {
        errors.push('Le stock doit être un nombre positif');
      }
    }

    // Stock minimum doit être positif
    if (data.stockMin !== undefined) {
      const stockMin = parseInt(data.stockMin);
      if (isNaN(stockMin) || stockMin < 0) {
        errors.push('Le stock minimum doit être un nombre positif');
      }
    }

    // Prix promo doit être inférieur au prix normal
    if (data.prixPromo && data.prix && parseFloat(data.prixPromo) >= parseFloat(data.prix)) {
      errors.push('Le prix promotionnel doit être inférieur au prix normal');
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.join(', '));
    }

    // Nettoyer et valider les données — noms de champs snake_case pour Prisma
    const validated = {};
    if (data.nom) validated.nom = data.nom.trim();
    if (data.description !== undefined) validated.description = data.description?.trim() || null;
    if (data.reference !== undefined) validated.reference = data.reference?.trim() || null;
    if (data.marque !== undefined) validated.marque = data.marque?.trim() || null;
    if (data.code_barres !== undefined) validated.code_barres = data.code_barres?.trim() || null;
    if (data.codeBarre !== undefined) validated.code_barres = data.codeBarre?.trim() || null;
    if (data.categorie) validated.categorie = data.categorie;
    if (data.statut) validated.statut = data.statut;
    if (data.notes !== undefined) validated.notes = data.notes?.trim() || null;
    if (data.slug !== undefined) validated.slug = data.slug?.trim() || null;
    if (data.meta_description !== undefined) validated.meta_description = data.meta_description?.trim() || null;
    if (data.metaDescription !== undefined) validated.meta_description = data.metaDescription?.trim() || null;
    if (data.visible !== undefined) validated.visible = Boolean(data.visible);
    if (data.tags !== undefined) validated.tags = Array.isArray(data.tags) ? data.tags : [];
    if (data.poids !== undefined) validated.poids = data.poids ? parseFloat(data.poids) : null;

    // Prix (snake_case pour Prisma)
    if (data.prix !== undefined) validated.prix = parseFloat(data.prix);
    // Prix promo : accepter les deux formes camelCase et snake_case
    const rawPrixPromo = data.prix_promo !== undefined ? data.prix_promo : data.prixPromo;
    if (rawPrixPromo !== undefined) validated.prix_promo = rawPrixPromo ? parseFloat(rawPrixPromo) : null;

    // Stock (snake_case pour Prisma)
    if (data.stock !== undefined) validated.stock = parseInt(data.stock);
    // Stock minimum : accepter les deux formes
    const rawStockMin = data.stock_min !== undefined ? data.stock_min : data.stockMin;
    if (rawStockMin !== undefined) validated.stock_min = parseInt(rawStockMin) || 5;

    return validated;
  }

  /**
   * Valider les données d'ajustement de stock
   */
  validateStockAdjustment(data) {
    const errors = [];

    if (!data.quantite || data.quantite <= 0) {
      errors.push('La quantité doit être positive');
    }

    if (!['AJOUT', 'RETRAIT', 'SET'].includes(data.type)) {
      errors.push('Type d\'ajustement invalide');
    }

    if (!data.motif) {
      errors.push('Le motif est requis');
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.join(', '));
    }

    return {
      quantite: parseInt(data.quantite),
      type: data.type,
      motif: data.motif,
      notes: data.notes?.trim() || null,
      referenceExterne: data.referenceExterne?.trim() || null,
      documentSource: data.documentSource?.trim() || null
    };
  }

  /**
   * Valider les données d'une commande
   */
  validateCommandeData(data) {
    const errors = [];

    if (!data.clientId) {
      errors.push('Le client est requis');
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      errors.push('Au moins un article est requis');
    }

    if (data.items) {
      data.items.forEach((item, index) => {
        if (!item.produitId) {
          errors.push(`Produit requis pour l'article ${index + 1}`);
        }
        if (!item.quantite || item.quantite <= 0) {
          errors.push(`Quantité invalide pour l'article ${index + 1}`);
        }
      });
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.join(', '));
    }

    return {
      clientId: data.clientId,
      items: data.items,
      notes: data.notes?.trim() || null,
      montantTotal: parseFloat(data.montantTotal || 0)
    };
  }
}

module.exports = ShopService;