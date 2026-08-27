const mongoose = require('mongoose');

const produitSchema = new mongoose.Schema(
  {
    idProduit: {
      type: Number,
      unique: true,
      sparse: true,
    },
    
    // Informations de base
    nom: {
      type: String,
      required: [true, 'Le nom du produit est requis'],
      trim: true,
      set: (v) => v ? v.trim() : v,
    },
    
    description: {
      type: String,
      trim: true,
    },
    
    // Catégorie
    categorie: {
      type: String,
      enum: {
        values: ['ALIMENTAIRE', 'EAU_ZAMZAM', 'DATTES', 'MIEL', 'ENCENS', 'TAPIS_PRIERE', 'VETEMENTS', 'LIVRES', 'BIJOUX', 'ACCESSOIRES', 'SOUVENIRS', 'AUTRE'],
        message: 'La catégorie doit être ALIMENTAIRE, EAU_ZAMZAM, DATTES, MIEL, ENCENS, TAPIS_PRIERE, VETEMENTS, LIVRES, BIJOUX, ACCESSOIRES, SOUVENIRS ou AUTRE',
      },
      required: [true, 'La catégorie est requise'],
    },
    
    // Prix et gestion financière
    prix: {
      type: mongoose.Decimal128,
      required: [true, 'Le prix est requis'],
      get: (v) => v ? parseFloat(v.toString()) : 0,
    },
    
    prixPromo: {
      type: mongoose.Decimal128,
      get: (v) => v ? parseFloat(v.toString()) : null,
    },
    
    // Gestion du stock
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Le stock ne peut pas être négatif'],
    },
    
    stockMin: {
      type: Number,
      default: 5,
      min: [0, 'Le stock minimum ne peut pas être négatif'],
    },
    
    // Statut et disponibilité
    statut: {
      type: String,
      enum: {
        values: ['ACTIF', 'INACTIF', 'RUPTURE_STOCK', 'ARCHIVE'],
        message: 'Le statut doit être ACTIF, INACTIF, RUPTURE_STOCK ou ARCHIVE',
      },
      default: 'ACTIF',
    },
    
    // Informations produit
    marque: {
      type: String,
      trim: true,
    },
    
    reference: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    
    codeBarres: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    
    // Dimensions et poids
    dimensions: {
      longueur: { type: Number },
      largeur: { type: Number },
      hauteur: { type: Number },
      unite: { type: String, default: 'cm' },
    },
    
    poids: {
      type: Number,
      min: [0, 'Le poids ne peut pas être négatif'],
    },
    
    // Images
    images: [{
      url: String,
      cloudinaryPublicId: String,
      altText: String,
      principal: { type: Boolean, default: false },
    }],
    
    // Tags pour recherche
    tags: [String],
    
    // Fournisseur
    fournisseur: {
      nom: String,
      contact: String,
      telephone: String,
      email: String,
    },
    
    // Métadonnées
    dateCreation: { type: Date, default: Date.now },
    dateDerniereModification: { type: Date, default: Date.now },
    creeParUtilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
    },
    modifieParUtilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    
    // Informations complémentaires
    notes: String,
    
    // SEO et visibilité en ligne (si boutique en ligne future)
    slug: String,
    metaDescription: String,
    visible: { type: Boolean, default: true },
    
  },
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

// Index pour améliorer les performances
produitSchema.index({ nom: 'text', description: 'text', tags: 'text' });
produitSchema.index({ categorie: 1, statut: 1 });
produitSchema.index({ reference: 1 });
produitSchema.index({ codeBarres: 1 });

// Virtuals
produitSchema.virtual('enRuptureStock').get(function() {
  return this.stock <= this.stockMin;
});

produitSchema.virtual('prixAffichage').get(function() {
  return this.prixPromo && this.prixPromo < this.prix ? this.prixPromo : this.prix;
});

produitSchema.virtual('remise').get(function() {
  if (this.prixPromo && this.prixPromo < this.prix) {
    return Math.round(((this.prix - this.prixPromo) / this.prix) * 100);
  }
  return 0;
});

// Hooks
produitSchema.pre('save', function() {
  // Mise à jour de la date de modification
  this.dateDerniereModification = new Date();
  
  // Génération d'un slug si pas défini
  if (!this.slug && this.nom) {
    this.slug = this.nom.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // Génération d'un ID unique si pas défini
  if (!this.idProduit) {
    this.idProduit = Date.now();
  }
  
  // Mise à jour automatique du statut si rupture de stock
  if (this.stock <= 0 && this.statut === 'ACTIF') {
    this.statut = 'RUPTURE_STOCK';
  } else if (this.stock > 0 && this.statut === 'RUPTURE_STOCK') {
    this.statut = 'ACTIF';
  }
});

// Méthodes d'instance
produitSchema.methods.ajusterStock = function(quantite, type = 'AJOUT') {
  if (type === 'AJOUT') {
    this.stock += quantite;
  } else if (type === 'RETRAIT') {
    this.stock = Math.max(0, this.stock - quantite);
  } else if (type === 'SET') {
    this.stock = Math.max(0, quantite);
  }
  return this.save();
};

produitSchema.methods.verifierDisponibilite = function(quantiteDemandee) {
  return this.statut === 'ACTIF' && this.stock >= quantiteDemandee;
};

produitSchema.methods.calculerValeurStock = function() {
  return this.stock * this.prix;
};

// Méthodes statiques
produitSchema.statics.rechercherProduits = function(terme, options = {}) {
  const query = {
    $and: [
      {
        $or: [
          { nom: { $regex: terme, $options: 'i' } },
          { description: { $regex: terme, $options: 'i' } },
          { tags: { $in: [new RegExp(terme, 'i')] } },
          { reference: { $regex: terme, $options: 'i' } },
        ]
      }
    ]
  };
  
  if (options.categorie) {
    query.$and.push({ categorie: options.categorie });
  }
  
  if (options.statut) {
    query.$and.push({ statut: options.statut });
  }
  
  return this.find(query);
};

produitSchema.statics.obtenirStatistiques = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalProduits: { $sum: 1 },
        valeurTotaleStock: {
          $sum: {
            $multiply: [
              { $ifNull: ['$stock', 0] },
              { $convert: { input: '$prix', to: 'double', onError: 0, onNull: 0 } }
            ]
          }
        },
        produitsActifs: { $sum: { $cond: [{ $eq: ['$statut', 'ACTIF'] }, 1, 0] } },
        produitsRupture: { $sum: { $cond: [{ $lte: ['$stock', '$stockMin'] }, 1, 0] } },
      }
    }
  ]);
};

module.exports = mongoose.model('Produit', produitSchema);