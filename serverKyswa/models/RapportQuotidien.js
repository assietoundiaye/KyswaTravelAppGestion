const mongoose = require('mongoose');

const rapportQuotidienSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
  },
  date: { type: Date, required: true, default: Date.now },
  activites: { type: String, required: true }, // Ce qui a été fait
  problemes: { type: String }, // Problèmes rencontrés
  objectifsDemain: { type: String }, // Objectifs du lendemain
  // Pour les commerciaux
  appelsClients: { type: Number, default: 0 },
  inscriptionsCreees: { type: Number, default: 0 },
  paiementsEncaisses: { type: Number, default: 0 },
  // Modifiable dans les 7 jours
  dateCreation: { type: Date, default: Date.now },
}, { timestamps: true });

// Index pour éviter les doublons (un rapport par agent par jour)
rapportQuotidienSchema.index(
  { agentId: 1, date: 1 },
  { unique: false }
);

module.exports = mongoose.model('RapportQuotidien', rapportQuotidienSchema);
