/**
 * Modèle StockMovement - Traçabilité des mouvements de stock
 * 
 * Enregistre chaque ajustement de stock avec :
 * - Produit concerné
 * - Quantité modifiée
 * - Type d'ajustement (AJOUT, RETRAIT, SET)
 * - Stock avant/après
 * - Motif et utilisateur
 * - Date/heure
 */

const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    // Référence au produit
    produitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Produit',
      required: [true, 'Le produit est requis'],
      index: true,
    },

    // Informations du mouvement
    type: {
      type: String,
      enum: {
        values: ['AJOUT', 'RETRAIT', 'SET', 'CORRECTION', 'INVENTAIRE'],
        message: 'Le type doit être AJOUT, RETRAIT, SET, CORRECTION ou INVENTAIRE',
      },
      required: [true, 'Le type de mouvement est requis'],
      index: true,
    },

    quantite: {
      type: Number,
      required: [true, 'La quantité est requise'],
    },

    // Valeurs avant et après
    stockAvant: {
      type: Number,
      required: [true, 'Le stock avant est requis'],
    },

    stockApres: {
      type: Number,
      required: [true, 'Le stock après est requis'],
    },

    // Raison et notes
    motif: {
      type: String,
      trim: true,
      enum: {
        values: [
          'VENTE',
          'ACHAT_FOURNISSEUR',
          'RETOUR_CLIENT',
          'CASSE',
          'PERTE',
          'INVENTAIRE_CORRECTION',
          'TRANSFERT_MAGASIN',
          'AJUSTEMENT_COMPTABLE',
          'AUTRE'
        ],
        message: 'Le motif doit être l\'un des motifs prédéfinis',
      },
      default: 'AUTRE',
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Les notes ne doivent pas dépasser 500 caractères'],
    },

    // Utilisateur qui a effectué l'ajustement
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, 'L\'utilisateur est requis'],
      index: true,
    },

    // Statut du mouvement
    statut: {
      type: String,
      enum: {
        values: ['CONFIRME', 'TEMPORAIRE', 'ANNULE'],
        message: 'Le statut doit être CONFIRME, TEMPORAIRE ou ANNULE',
      },
      default: 'CONFIRME',
    },

    // Dates et références
    dateEvenement: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Référence optionnelle (numéro de commande, facture, etc.)
    referenceExterne: {
      type: String,
      trim: true,
    },

    // Document source (commande, facture, bon de retour)
    documentSource: {
      type: String,
      enum: ['COMMANDE', 'FACTURE', 'BON_RETOUR', 'INVENTAIRE', 'AUTRE'],
    },
  },
  {
    timestamps: true,
    collection: 'stock_movements',
    index: { 'createdAt': 1 },
  }
);

// Index composés pour les requêtes courantes
stockMovementSchema.index({ produitId: 1, dateEvenement: -1 });
stockMovementSchema.index({ userId: 1, dateEvenement: -1 });
stockMovementSchema.index({ type: 1, dateEvenement: -1 });

// Index texte pour la recherche
stockMovementSchema.index({ motif: 'text', notes: 'text' });

// Virtuel : différence calculée
stockMovementSchema.virtual('difference').get(function() {
  return this.stockApres - this.stockAvant;
});

/**
 * Méthode statique : Créer une entrée de mouvement
 */
stockMovementSchema.statics.creerMouvement = async function({
  produitId,
  type,
  quantite,
  stockAvant,
  stockApres,
  motif,
  notes,
  userId,
  referenceExterne,
  documentSource
}) {
  try {
    const mouvement = new this({
      produitId,
      type,
      quantite,
      stockAvant,
      stockApres,
      motif,
      notes,
      userId,
      referenceExterne,
      documentSource,
      statut: 'CONFIRME',
    });

    await mouvement.save();
    
    // Populate pour retourner les infos complètes
    await mouvement.populate('produitId', 'nom categorie');
    try {
      await mouvement.populate('userId', 'nom prenom email');
    } catch (populateError) {
      // Ignore the populate error when the user model is unavailable in tests or isolated contexts.
    }

    return mouvement;
  } catch (error) {
    console.error('Erreur création mouvement stock:', error);
    throw error;
  }
};

/**
 * Méthode statique : Récupérer l'historique d'un produit
 */
stockMovementSchema.statics.obtenirHistorique = async function(produitId, limit = 50) {
  try {
    return await this.find({ produitId })
      .populate('userId', 'nom prenom email')
      .sort({ dateEvenement: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    throw error;
  }
};

/**
 * Méthode statique : Rapport d'ajustements par période
 */
stockMovementSchema.statics.rapportPeriode = async function(dateDebut, dateFin, produitId = null) {
  try {
    const query = {
      dateEvenement: { $gte: dateDebut, $lte: dateFin },
    };

    if (produitId) {
      query.produitId = produitId;
    }

    return await this.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          quantiteTotale: { $sum: '$quantite' },
          differenceNetaTotal: { $sum: { $subtract: ['$stockApres', '$stockAvant'] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  } catch (error) {
    console.error('Erreur rapport période:', error);
    throw error;
  }
};

/**
 * Middleware : Avant sauvegarde, s'assurer que difference = stockApres - stockAvant
 */
stockMovementSchema.pre('save', async function() {
  if (this.type === 'SET') {
    this.quantite = this.stockApres - this.stockAvant;
  }
});

module.exports = mongoose.model('StockMovement', stockMovementSchema);
