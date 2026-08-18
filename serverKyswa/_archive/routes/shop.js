const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Produit = require('../models/Produit');
const StockMovement = require('../models/StockMovement');
const ShopOrder = require('../models/ShopOrder');
const shopOrderService = require('../services/shopOrderService');
const { protect, requirePermission, requireRole } = require('../middleware/auth');
const { PERMISSIONS, ROLES } = require('../config/permissions');

function toNumber(value) {
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

// Protéger toutes les routes avec auth
router.use(protect);
router.use(requirePermission(PERMISSIONS.SHOP_READ));

/**
 * GET /api/shop/produits
 * Récupérer tous les produits avec filtres
 */
router.get('/produits', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      categorie, 
      statut,
      sortBy = 'nom',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    // Construction de la requête
    let query = {};
    
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (categorie && categorie !== 'TOUTES') {
      query.categorie = categorie;
    }
    
    if (statut && statut !== 'TOUS') {
      query.statut = statut;
    }

    // Exécution des requêtes en parallèle
    const [produits, total] = await Promise.all([
      Produit.find(query)
        .populate('creeParUtilisateurId', 'nom prenom email')
        .populate('modifieParUtilisateurId', 'nom prenom email')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(parseInt(limit)),
      Produit.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: {
        produits,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération produits:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de la récupération des produits' 
    });
  }
});

/**
 * GET /api/shop/produits/:id
 * Récupérer un produit par ID
 */
router.get('/produits/:id', async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id)
      .populate('creeParUtilisateurId', 'nom prenom email')
      .populate('modifieParUtilisateurId', 'nom prenom email');

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    return res.status(200).json({
      success: true,
      data: { produit }
    });

  } catch (error) {
    console.error('Erreur récupération produit:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du produit'
    });
  }
});

/**
 * POST /api/shop/produits
 * Créer un nouveau produit
 */
router.post('/produits', 
  requirePermission(PERMISSIONS.SHOP_CREATE),
  [
    body('nom')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    body('prix')
      .isFloat({ min: 0 })
      .withMessage('Le prix doit être un nombre positif'),
    body('categorie')
      .isIn(['ALIMENTAIRE', 'EAU_ZAMZAM', 'DATTES', 'MIEL', 'ENCENS', 'TAPIS_PRIERE', 'VETEMENTS', 'LIVRES', 'BIJOUX', 'ACCESSOIRES', 'SOUVENIRS', 'AUTRE'])
      .withMessage('Catégorie invalide'),
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Le stock doit être un nombre entier positif'),
  ],
  async (req, res) => {
    try {
      // Vérification des erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const {
        nom, description, categorie, prix, prixPromo, stock = 0, stockMin = 5,
        marque, reference, codeBarres, dimensions, poids, tags, fournisseur, notes
      } = req.body;

      // Vérifier l'unicité de la référence si fournie
      if (reference) {
        const existingRef = await Produit.findOne({ reference });
        if (existingRef) {
          return res.status(400).json({
            success: false,
            message: 'Cette référence existe déjà'
          });
        }
      }

      // Vérifier l'unicité du code-barres si fourni
      if (codeBarres) {
        const existingCode = await Produit.findOne({ codeBarres });
        if (existingCode) {
          return res.status(400).json({
            success: false,
            message: 'Ce code-barres existe déjà'
          });
        }
      }

      const produit = new Produit({
        nom,
        description,
        categorie,
        prix,
        prixPromo,
        stock,
        stockMin,
        marque,
        reference,
        codeBarres,
        dimensions,
        poids,
        tags: Array.isArray(tags) ? tags : [],
        fournisseur,
        notes,
        creeParUtilisateurId: req.user.id
      });

      await produit.save();

      // Populer les références avant de retourner
      await produit.populate('creeParUtilisateurId', 'nom prenom email');

      return res.status(201).json({
        success: true,
        message: 'Produit créé avec succès',
        data: { produit }
      });

    } catch (error) {
      console.error('Erreur création produit:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la création du produit'
      });
    }
  }
);

/**
 * PATCH /api/shop/produits/:id
 * Mettre à jour un produit
 */
router.patch('/produits/:id',
  requirePermission(PERMISSIONS.SHOP_UPDATE),
  [
    body('nom')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    body('prix')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Le prix doit être un nombre positif'),
    body('categorie')
      .optional()
      .isIn(['ALIMENTAIRE', 'EAU_ZAMZAM', 'DATTES', 'MIEL', 'ENCENS', 'TAPIS_PRIERE', 'VETEMENTS', 'LIVRES', 'BIJOUX', 'ACCESSOIRES', 'SOUVENIRS', 'AUTRE'])
      .withMessage('Catégorie invalide'),
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Le stock doit être un nombre entier positif'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const produit = await Produit.findById(req.params.id);
      if (!produit) {
        return res.status(404).json({
          success: false,
          message: 'Produit non trouvé'
        });
      }

      // Vérifier l'unicité de la référence si modifiée
      if (req.body.reference && req.body.reference !== produit.reference) {
        const existingRef = await Produit.findOne({ 
          reference: req.body.reference,
          _id: { $ne: req.params.id }
        });
        if (existingRef) {
          return res.status(400).json({
            success: false,
            message: 'Cette référence existe déjà pour un autre produit'
          });
        }
      }

      // Vérifier l'unicité du code-barres si modifié
      if (req.body.codeBarres && req.body.codeBarres !== produit.codeBarres) {
        const existingCode = await Produit.findOne({ 
          codeBarres: req.body.codeBarres,
          _id: { $ne: req.params.id }
        });
        if (existingCode) {
          return res.status(400).json({
            success: false,
            message: 'Ce code-barres existe déjà pour un autre produit'
          });
        }
      }

      // Log pour audit
      console.log(`📝 Modification produit #${req.params.id} par ${req.user.email} (${req.user.role})`);

      // Mise à jour des champs autorisés
      const champsAutorisés = [
        'nom', 'description', 'categorie', 'prix', 'prixPromo', 
        'stock', 'stockMin', 'statut', 'marque', 'reference', 
        'codeBarres', 'dimensions', 'poids', 'tags', 'fournisseur', 
        'notes', 'visible'
      ];

      champsAutorisés.forEach(champ => {
        if (req.body[champ] !== undefined) {
          produit[champ] = req.body[champ];
        }
      });

      produit.modifieParUtilisateurId = req.user.id;
      const produitSauve = await produit.save();

      // Populer les références
      await produitSauve.populate([
        { path: 'creeParUtilisateurId', select: 'nom prenom email' },
        { path: 'modifieParUtilisateurId', select: 'nom prenom email' }
      ]);

      console.log(`✅ Produit #${req.params.id} mis à jour avec succès`);

      return res.status(200).json({
        success: true,
        message: 'Produit mis à jour avec succès',
        data: { produit: produitSauve }
      });

    } catch (error) {
      console.error('❌ Erreur mise à jour produit:', error);
      
      // Gestion spécifique des erreurs Mongoose
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Erreurs de validation',
          errors: validationErrors
        });
      }

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID de produit invalide'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la mise à jour du produit'
      });
    }
  }
);

/**
 * DELETE /api/shop/produits/:id
 * Supprimer un produit
 */
router.delete('/produits/:id',
  requirePermission(PERMISSIONS.SHOP_DELETE),
  async (req, res) => {
    try {
      const produit = await Produit.findById(req.params.id);
      if (!produit) {
        return res.status(404).json({
          success: false,
          message: 'Produit non trouvé'
        });
      }

      // Vérifier si le produit est référencé dans des commandes
      const commandesLiees = await ShopOrder.countDocuments({
        'items.produitId': req.params.id
      });

      if (commandesLiees > 0) {
        return res.status(400).json({
          success: false,
          message: `Impossible de supprimer ce produit. Il est référencé dans ${commandesLiees} commande(s).`,
          data: { commandesLiees }
        });
      }

      // Log pour audit
      console.log(`🗑️ Suppression produit "${produit.nom}" (#${req.params.id}) par ${req.user.email} (${req.user.role})`);

      // Supprimer d'abord les mouvements de stock liés
      const mouvementsSupprimes = await StockMovement.deleteMany({
        produitId: req.params.id
      });

      console.log(`📊 ${mouvementsSupprimes.deletedCount} mouvements de stock supprimés pour le produit #${req.params.id}`);

      // Supprimer le produit
      await Produit.findByIdAndDelete(req.params.id);

      console.log(`✅ Produit #${req.params.id} supprimé avec succès`);

      return res.status(200).json({
        success: true,
        message: 'Produit supprimé avec succès',
        data: {
          produitSupprime: {
            id: req.params.id,
            nom: produit.nom
          },
          mouvementsSupprimes: mouvementsSupprimes.deletedCount,
          suppressionPar: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
          },
          timestamp: new Date()
        }
      });

    } catch (error) {
      console.error('❌ Erreur suppression produit:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID de produit invalide'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la suppression du produit'
      });
    }
  }
);

/**
 * DELETE /api/shop/produits
 * Supprimer TOUS les produits (opération destructive)
 */
router.delete('/produits',
  requireRole(ROLES.ADMIN, ROLES.DG), // Seuls Admin et DG peuvent effectuer cette opération
  async (req, res) => {
    try {
      console.log(`🔥 SUPPRESSION MASSIVE - Initiée par ${req.user.email} (${req.user.role})`);
      
      // Compter les produits avant suppression
      const countAvant = await Produit.countDocuments();
      console.log(`📊 ${countAvant} produits trouvés dans la base`);
      
      if (countAvant === 0) {
        return res.status(200).json({
          success: true,
          message: 'Aucun produit à supprimer',
          data: { produitsSupprimes: 0 }
        });
      }

      // Supprimer tous les mouvements de stock liés aux produits
      const countMouvements = await StockMovement.countDocuments();
      console.log(`📊 ${countMouvements} mouvements de stock à supprimer`);
      
      if (countMouvements > 0) {
        await StockMovement.deleteMany({});
        console.log(`✅ ${countMouvements} mouvements de stock supprimés`);
      }

      // Supprimer tous les produits
      const resultat = await Produit.deleteMany({});
      console.log(`✅ ${resultat.deletedCount} produits supprimés de la base de données`);

      return res.status(200).json({
        success: true,
        message: `Suppression massive terminée : ${resultat.deletedCount} produits et ${countMouvements} mouvements supprimés`,
        data: { 
          produitsSupprimes: resultat.deletedCount,
          mouvementsSupprimes: countMouvements,
          utilisateur: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
          },
          timestamp: new Date()
        }
      });

    } catch (error) {
      console.error('🚨 Erreur suppression massive:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la suppression massive des produits'
      });
    }
  }
);

/**
 * POST /api/shop/produits/:id/ajuster-stock
 * Ajuster le stock d'un produit
 */
router.post('/produits/:id/ajuster-stock',
  requirePermission(PERMISSIONS.SHOP_MANAGE_STOCK),
  [
    body('quantite')
      .isInt({ min: 1 })
      .withMessage('La quantité doit être un nombre entier positif'),
    body('type')
      .isIn(['AJOUT', 'RETRAIT', 'SET'])
      .withMessage('Le type doit être AJOUT, RETRAIT ou SET'),
    body('motif')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Le motif ne doit pas dépasser 255 caractères')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { quantite, type, motif, notes, referenceExterne, documentSource } = req.body;
      
      const produit = await Produit.findById(req.params.id);
      if (!produit) {
        return res.status(404).json({
          success: false,
          message: 'Produit non trouvé'
        });
      }

      const ancienStock = produit.stock;
      await produit.ajusterStock(quantite, type);
      const nouveauStock = produit.stock;

      // ✅ Enregistrer le mouvement de stock
      const mouvement = await StockMovement.creerMouvement({
        produitId: produit._id,
        type,
        quantite,
        stockAvant: ancienStock,
        stockApres: nouveauStock,
        motif: motif || 'AUTRE',
        notes,
        userId: req.user.id,
        referenceExterne,
        documentSource
      });

      // Log pour debugging
      console.log(`✅ Ajustement stock enregistré - Produit: ${produit.nom} (#${mouvement._id}), ${ancienStock} → ${nouveauStock}, Type: ${type}`);

      return res.status(200).json({
        success: true,
        message: 'Stock ajusté et enregistré avec succès',
        data: { 
          produit: {
            id: produit._id,
            nom: produit.nom,
            ancienStock,
            nouveauStock,
            type,
            motif
          },
          mouvementId: mouvement._id
        }
      });

    } catch (error) {
      console.error('Erreur ajustement stock:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de l\'ajustement du stock'
      });
    }
  }
);

/**
 * GET /api/shop/statistiques
 * Récupérer les statistiques des produits
 */
router.post('/commandes', requirePermission(PERMISSIONS.SHOP_CREATE), async (req, res) => {
  try {
    const { clientId, items, notes } = req.body;
    const order = await shopOrderService.creerCommande({
      clientId,
      createdBy: req.user.id,
      items,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: { order },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/commandes', requirePermission(PERMISSIONS.SHOP_READ), async (req, res) => {
  try {
    const orders = await shopOrderService.listerCommandes();
    return res.status(200).json({ success: true, data: { orders } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur lors du chargement des commandes' });
  }
});

router.post('/commandes/:id/payer', requireRole(ROLES.COMPTABLE, ROLES.ADMIN, ROLES.DG), async (req, res) => {
  try {
    const order = await shopOrderService.confirmerPaiement(req.params.id, req.body, req.user.id);
    return res.status(200).json({ success: true, message: 'Paiement confirmé', data: { order } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Supprimer une commande entière
router.delete('/commandes/:id', requireRole(ROLES.COMMERCIAL, ROLES.ADMIN), async (req, res) => {
  try {
    const { motif } = req.body;
    const order = await shopOrderService.supprimerCommande(req.params.id, req.user.id, motif);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Commande supprimée avec succès', 
      data: { 
        order,
        action: 'COMMANDE_SUPPRIMEE',
        suppressionPar: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Erreur suppression commande shop:', error);
    return res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.delete('/commandes/:id/paiement', requireRole(ROLES.COMPTABLE, ROLES.ADMIN, ROLES.DG), async (req, res) => {
  try {
    const { motif } = req.body;
    const order = await shopOrderService.supprimerPaiement(req.params.id, req.user.id, motif);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Paiement supprimé avec succès', 
      data: { 
        order,
        action: 'PAIEMENT_SUPPRIME',
        suppressionPar: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Erreur suppression paiement shop:', error);
    return res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.get('/statistiques', async (req, res) => {
  try {
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);

    const [stats, statsParCategorie, commandesMois] = await Promise.all([
      Produit.obtenirStatistiques(),
      Produit.aggregate([
        {
          $group: {
            _id: '$categorie',
            count: { $sum: 1 },
            valeurStock: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$stock', 0] },
                  { $convert: { input: '$prix', to: 'double', onError: 0, onNull: 0 } }
                ]
              }
            },
            stockMoyen: { $avg: '$stock' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      ShopOrder.countDocuments({ createdAt: { $gte: debutMois } })
    ]);

    const statistiquesGenerales = stats[0] || {};
    const valeurTotaleStock = toNumber(statistiquesGenerales.valeurTotaleStock);

    // Produits en rupture de stock
    const produitsRupture = await Produit.find({
      $expr: { $lte: ['$stock', '$stockMin'] }
    }).select('nom stock stockMin').limit(10);

    return res.status(200).json({
      success: true,
      data: {
        statistiquesGenerales: {
          ...statistiquesGenerales,
          valeurTotaleStock,
        },
        commandesMois,
        statistiquesParCategorie: statsParCategorie.map((item) => ({
          ...item,
          valeurStock: toNumber(item.valeurStock),
        })),
        alertesStock: produitsRupture,
        // Alias plats pour compatibilité directe
        totalProduits: statistiquesGenerales.totalProduits ?? 0,
        valeurTotaleStock,
        produitsActifs: statistiquesGenerales.produitsActifs ?? 0,
        ruptureStock: statistiquesGenerales.produitsRupture ?? 0,
      }
    });

  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des statistiques'
    });
  }
});

/**
 * GET /api/shop/categories
 * Récupérer les catégories disponibles
 */
router.get('/categories', (req, res) => {
  const categories = [
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

  return res.status(200).json({
    success: true,
    data: { categories }
  });
});

/**
 * GET /api/shop/produits/:id/mouvements
 * Récupérer l'historique des mouvements de stock d'un produit
 */
router.get('/produits/:id/mouvements', async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const produit = await Produit.findById(req.params.id).select('nom');
    if (!produit) {
      return res.status(404).json({
        success: false,
        message: 'Produit non trouvé'
      });
    }

    const [mouvements, total] = await Promise.all([
      StockMovement.find({ produitId: req.params.id })
        .populate('userId', 'nom prenom email')
        .sort({ dateEvenement: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean(),
      StockMovement.countDocuments({ produitId: req.params.id })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        produit: {
          id: produit._id,
          nom: produit.nom
        },
        mouvements,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: parseInt(skip) + parseInt(limit) < total
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération mouvements stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des mouvements'
    });
  }
});

/**
 * GET /api/shop/mouvements/rapport?dateDebut=...&dateFin=...
 * Rapport d'ajustements par période
 */
router.get('/mouvements/rapport', requirePermission(PERMISSIONS.SHOP_READ), async (req, res) => {
  try {
    const { dateDebut, dateFin, produitId } = req.query;

    if (!dateDebut || !dateFin) {
      return res.status(400).json({
        success: false,
        message: 'Les paramètres dateDebut et dateFin sont requis'
      });
    }

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    if (isNaN(debut) || isNaN(fin)) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide (ISO 8601 requis)'
      });
    }

    const rapport = await StockMovement.rapportPeriode(
      debut,
      fin,
      produitId || null
    );

    return res.status(200).json({
      success: true,
      data: {
        periode: { debut, fin },
        produitId: produitId || null,
        resume: rapport
      }
    });

  } catch (error) {
    console.error('Erreur rapport mouvements stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la génération du rapport'
    });
  }
});

module.exports = router;