const mongoose = require('mongoose');

const ziarraProspectSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
  },
  // Si pas encore client
  nom: { type: String, trim: true },
  prenom: { type: String, trim: true },
  telephone: { type: String, trim: true },
  email: { type: String, trim: true },

  statut: {
    type: String,
    enum: ['PROSPECT', 'INTERESSE', 'CONFIRME', 'PARTI', 'ANNULE'],
    default: 'PROSPECT',
  },
  dateContact: { type: Date, default: Date.now },
  dateDepart: { type: Date },
  notes: { type: String },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
  },
}, { timestamps: true });

module.exports = mongoose.model('ZiarraProspect', ziarraProspectSchema);
