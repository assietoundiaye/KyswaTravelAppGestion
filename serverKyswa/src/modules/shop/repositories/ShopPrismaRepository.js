/**
 * @fileoverview Repository pour le module Shop - Version Prisma PostgreSQL
 * Remplace la version MongoDB/Mongoose
 */

const BaseRepository = require('../../../shared/decorators/BaseRepository');
const prismaClient = require('../../../database/client');

class ShopPrismaRepository extends BaseRepository {
  constructor() {
    super(prismaClient.shop_produits);
    this.produitsModel = prismaClient.shop_produits;
    this.stockMovementsModel = prismaClient.shop_stock_movements;
    this.commandesModel = prismaClient.shop_commandes;
    this.commandeItemsModel = prismaClient.shop_commande_items;
    this.tableName = 'shop_produits';
  }

  // ── Gestion des produits ──────────────────────────────────────────────────

  /**
   * Obtenir tous les produits avec filtres et pagination
   */
  async getProduits(filters = {}) {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      categorie, 
      statut, 
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = filters;

    const skip = (page - 1) * limit;
    const where = {};

    // Filtres de recherche
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (categorie && categorie !== 'TOUTES') {
      where.categorie = categorie;
    }

    if (statut && statut !== 'TOUS') {
      if (statut === 'RUPTURE_STOCK') {
        where.stock = { lte: where.stock_min || 5 };
      } else {
        where.statut = statut;
      }
    }

    // Construction du sort (mapping camelCase -> snake_case)
    const sortFieldMap = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      prixPromo: 'prix_promo',
      stockMin: 'stock_min',
    };
    const validSortField = sortFieldMap[sortBy] || sortBy || 'created_at';
    const orderBy = { [validSortField]: sortOrder === 'desc' ? 'desc' : 'asc' };

    const [produits, total] = await Promise.all([
      this.produitsModel.findMany({
        where,
        orderBy,
        skip,
        take: limit
      }),
      this.produitsModel.count({ where })
    ]);

    return {
      produits,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };
  }

  /**
   * Obtenir un produit par ID
   */
  async getProduitById(id) {
    return this.produitsModel.findUnique({
      where: { id },
      include: {
        mouvements_stock: {
          orderBy: { created_at: 'desc' },
          take: 10
        }
      }
    });
  }

  /**
   * Créer un nouveau produit
   */
  async createProduit(produitData) {
    return this.produitsModel.create({
      data: produitData
    });
  }

  /**
   * Mettre à jour un produit
   */
  async updateProduit(id, updateData) {
    return this.produitsModel.update({
      where: { id },
      data: {
        ...updateData,
        updated_at: new Date()
      }
    });
  }

  /**
   * Supprimer un produit
   */
  async deleteProduit(id) {
    return this.produitsModel.delete({
      where: { id }
    });
  }

  /**
   * Supprimer tous les produits (opération destructive)
   */
  async deleteAllProduits() {
    const result = await this.produitsModel.deleteMany({});
    return { deletedCount: result.count };
  }

  // ── Gestion du stock ──────────────────────────────────────────────────────

  /**
   * Ajuster le stock d'un produit
   */
  async ajusterStock(produitId, adjustment, userId) {
    const { quantite, type, motif, notes, reference_externe, document_source } = adjustment;

    const produit = await this.produitsModel.findUnique({
      where: { id: produitId }
    });

    if (!produit) {
      throw new Error('Produit non trouvé');
    }

    let nouvelle_quantite;
    const ancienne_quantite = produit.stock;

    // Calculer la nouvelle quantité selon le type d'ajustement
    switch (type) {
      case 'AJOUT':
        nouvelle_quantite = ancienne_quantite + quantite;
        break;
      case 'RETRAIT':
        nouvelle_quantite = Math.max(0, ancienne_quantite - quantite);
        break;
      case 'SET':
        nouvelle_quantite = quantite;
        break;
      default:
        throw new Error('Type d\'ajustement invalide');
    }

    // Transaction pour mettre à jour le produit ET créer le mouvement de stock
    const result = await prismaClient.$transaction(async (prisma) => {
      // Mettre à jour le stock du produit
      const produitMiseAJour = await prisma.shop_produits.update({
        where: { id: produitId },
        data: { 
          stock: nouvelle_quantite,
          updated_at: new Date()
        }
      });

      // Créer le mouvement de stock
      const mouvement = await prisma.shop_stock_movements.create({
        data: {
          produit_id: produitId,
          ancienne_quantite,
          nouvelle_quantite,
          quantite_ajustee: type === 'SET' ? nouvelle_quantite - ancienne_quantite : 
                          type === 'AJOUT' ? quantite : -quantite,
          type,
          motif,
          notes,
          reference_externe,
          document_source,
          cree_par_user_id: userId
        }
      });

      return { produit: produitMiseAJour, mouvement };
    });

    return result;
  }

  /**
   * Obtenir l'historique des mouvements de stock
   */
  async getMouvementsStock(produitId, filters = {}) {
    const { page = 1, limit = 50, dateDebut, dateFin } = filters;
    const skip = (page - 1) * limit;

    const where = { produit_id: produitId };

    if (dateDebut || dateFin) {
      where.created_at = {};
      if (dateDebut) where.created_at.gte = new Date(dateDebut);
      if (dateFin) where.created_at.lte = new Date(dateFin);
    }

    const [mouvements, total] = await Promise.all([
      this.stockMovementsModel.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      this.stockMovementsModel.count({ where })
    ]);

    return {
      mouvements,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };
  }

  // ── Statistiques ──────────────────────────────────────────────────────────

  /**
   * Obtenir les statistiques générales du shop
   */
  async getStatistiques() {
    try {
      const debut = new Date();
      debut.setDate(1); // Premier jour du mois

      const [
        totalProduits,
        produitsActifs,
        produitsRupture,
        commandesMois
      ] = await Promise.all([
        this.produitsModel.count(),
        this.produitsModel.count({ where: { statut: 'ACTIF' } }),
        this.produitsModel.count({ 
          where: {
            OR: [
              { stock: { lte: this.produitsModel.fields.stock_min } },
              { stock: { lte: 5 } } // Valeur par défaut si stock_min n'est pas défini
            ]
          }
        }),
        this.commandesModel.count({ where: { created_at: { gte: debut } } })
      ]);

      // Calculer la valeur totale du stock côté application
      const produitsActifsAvecStock = await this.produitsModel.findMany({
        where: { statut: 'ACTIF' },
        select: { prix: true, stock: true }
      });

      const valeurStock = produitsActifsAvecStock.reduce((total, produit) => {
        return total + (parseFloat(produit.prix || 0) * parseInt(produit.stock || 0));
      }, 0);

      return {
        statistiquesGenerales: {
          totalProduits,
          produitsActifs,
          produitsRupture,
          valeurTotaleStock: valeurStock
        },
        commandesMois
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      // Retourner des statistiques par défaut en cas d'erreur
      return {
        statistiquesGenerales: {
          totalProduits: 0,
          produitsActifs: 0,
          produitsRupture: 0,
          valeurTotaleStock: 0
        },
        commandesMois: 0
      };
    }
  }

  /**
   * Obtenir les catégories disponibles
   */
  async getCategories() {
    try {
      // Utiliser une approche différente pour obtenir les catégories distinctes avec Prisma
      const produits = await this.produitsModel.findMany({
        select: { categorie: true },
        where: { 
          categorie: { not: null },
          statut: 'ACTIF' 
        }
      });

      // Extraire les catégories uniques côté application
      const categories = [...new Set(produits.map(p => p.categorie).filter(Boolean))];
      
      return { categories };
    } catch (error) {
      // En cas d'erreur, retourner les catégories par défaut
      return { 
        categories: [
          'ALIMENTAIRE', 'EAU_ZAMZAM', 'DATTES', 'MIEL', 'ENCENS', 
          'TAPIS_PRIERE', 'VETEMENTS', 'LIVRES', 'BIJOUX', 
          'ACCESSOIRES', 'SOUVENIRS', 'AUTRE'
        ] 
      };
    }
  }

  // ── Gestion des commandes ─────────────────────────────────────────────────

  /**
   * Créer une nouvelle commande
   */
  async createCommande(commandeData) {
    const { items, ...commandeBase } = commandeData;

    return await prismaClient.$transaction(async (prisma) => {
      // Créer la commande
      const commande = await prisma.shop_commandes.create({
        data: commandeBase
      });

      // Créer les items de commande
      if (items && items.length > 0) {
        await prisma.shop_commande_items.createMany({
          data: items.map(item => ({
            ...item,
            commande_id: commande.id
          }))
        });
      }

      // Retourner la commande avec ses items
      return prisma.shop_commandes.findUnique({
        where: { id: commande.id },
        include: {
          client: {
            select: { nom: true, prenom: true, email: true, telephone: true }
          },
          items: {
            include: {
              produit: {
                select: { nom: true, reference: true }
              }
            }
          }
        }
      });
    });
  }

  /**
   * Obtenir toutes les commandes
   */
  async getCommandes(filters = {}) {
    const { page = 1, limit = 20, statut, dateDebut, dateFin } = filters;
    const skip = (page - 1) * limit;
    
    const where = {};
    
    if (statut) where.status = statut;
    if (dateDebut || dateFin) {
      where.created_at = {};
      if (dateDebut) where.created_at.gte = new Date(dateDebut);
      if (dateFin) where.created_at.lte = new Date(dateFin);
    }

    const [commandes, total] = await Promise.all([
      this.commandesModel.findMany({
        where,
        include: {
          client: {
            select: { nom: true, prenom: true, email: true, telephone: true }
          },
          items: {
            include: {
              produit: {
                select: { nom: true, reference: true }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      this.commandesModel.count({ where })
    ]);

    return {
      orders: commandes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };
  }

  /**
   * Obtenir une commande par ID
   */
  async getCommandeById(id) {
    return this.commandesModel.findUnique({
      where: { id },
      include: {
        client: {
          select: { nom: true, prenom: true, email: true, telephone: true }
        },
        items: {
          include: {
            produit: {
              select: { nom: true, reference: true, prix: true }
            }
          }
        }
      }
    });
  }

  /**
   * Mettre à jour une commande
   */
  async updateCommande(id, updateData) {
    return this.commandesModel.update({
      where: { id },
      data: {
        ...updateData,
        updated_at: new Date()
      }
    });
  }

  /**
   * Supprimer une commande
   */
  async deleteCommande(id) {
    return this.commandesModel.delete({
      where: { id }
    });
  }
}

module.exports = ShopPrismaRepository;