const mongoose = require('mongoose');

const appelDetailSchema = new mongoose.Schema({
  nom: String,
  telephone: String,
  motif: String,
  type: { type: String, enum: ['ENTRANT', 'SORTANT'], default: 'SORTANT' },
  commentaire: String,
}, { _id: false });

const rapportQuotidienSchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  date: { type: Date, required: true, default: Date.now },
  dateCreation: { type: Date, default: Date.now },
  dateModification: { type: Date, default: Date.now },

  // Champs communs
  activites: { type: String, required: true },
  problemes: { type: String },
  objectifsDemain: { type: String },
  notes: { type: String },
  statutJournee: { 
    type: String, 
    enum: ['PRODUCTIF', 'NORMAL', 'DIFFICILE', 'TELETRAVAIL', 'ABSENT'], 
    default: 'NORMAL' 
  },

  // Champs commercial
  appelsClients: { type: Number, default: 0 },
  inscriptionsCreees: { type: Number, default: 0 },
  paiementsEncaisses: { type: Number, default: 0 },
  suiviCommercial: { type: String },
  constats: { type: String },
  appelsDetail: [appelDetailSchema],

  // Champs social media
  plateformes: [String],
  publications: { type: Number, default: 0 },
  vues: { type: Number, default: 0 },
  abonnesGagnes: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  commentaires: { type: Number, default: 0 },
  partages: { type: Number, default: 0 },
  campagnesActives: { type: Number, default: 0 },
  budgetCampagne: { type: Number, default: 0 },
  tauxEngagement: { type: Number, default: 0 },

  // Champs informatique
  articlesPub: { type: Number, default: 0 },
  packagesMAJ: { type: Number, default: 0 },
  bugsCorriges: { type: Number, default: 0 },
  etatSite: { type: String },
  problemesRegles: { type: String },
  backupEffectue: { type: Boolean, default: false },
  maintenancePreventive: { type: String },

  // Champs DG/Direction
  alertes: [{ 
    message: String,
    priorite: { type: String, enum: ['FAIBLE', 'MOYENNE', 'HAUTE', 'CRITIQUE'] },
    statut: { type: String, enum: ['NOUVEAU', 'EN_COURS', 'RESOLU'], default: 'NOUVEAU' }
  }],
  commentairesDirection: { type: String },
  statutLecture: { type: Boolean, default: false },
  dateValidation: { type: Date },

  // Métadonnées
  version: { type: Number, default: 1 },
  historiqueMoifications: [{
    date: { type: Date, default: Date.now },
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
    champsModifies: [String],
    raisonModification: String
  }]
}, { timestamps: true });

// Index unique pour éviter les doublons par jour
rapportQuotidienSchema.index({ agentId: 1, date: 1 }, { 
  unique: true,
  partialFilterExpression: { date: { $type: "date" } }
});

// Index pour les requêtes de performance
rapportQuotidienSchema.index({ date: -1 });
rapportQuotidienSchema.index({ agentId: 1, dateCreation: -1 });

module.exports = mongoose.model('RapportQuotidien', rapportQuotidienSchema);
