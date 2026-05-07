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

  // Commun
  activites: { type: String, required: true },
  problemes: { type: String },
  objectifsDemain: { type: String },
  notes: { type: String },

  // Commercial
  appelsClients: { type: Number, default: 0 },
  inscriptionsCreees: { type: Number, default: 0 },
  paiementsEncaisses: { type: Number, default: 0 },
  suiviCommercial: { type: String },
  constats: { type: String },
  appelsDetail: [appelDetailSchema],

  // Social
  plateformes: [String],
  publications: { type: Number, default: 0 },
  vues: { type: Number, default: 0 },
  abonnesGagnes: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  campagnesActives: { type: Number, default: 0 },
  budgetCampagne: { type: Number, default: 0 },

  // Informatique
  articlesPub: { type: Number, default: 0 },
  packagesMAJ: { type: Number, default: 0 },
  etatSite: { type: String },
  problemesRegles: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('RapportQuotidien', rapportQuotidienSchema);
