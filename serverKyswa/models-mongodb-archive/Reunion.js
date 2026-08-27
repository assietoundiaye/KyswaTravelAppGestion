const mongoose = require('mongoose');

const reunionSchema = new mongoose.Schema({
  packageKId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PackageK',
    required: true,
  },
  titre: {
    type: String,
    required: true,
    trim: true,
  },
  dateReunion: {
    type: Date,
    required: true,
  },
  lieu: { type: String },
  ordreJour: { type: String },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
  }],
  statut: {
    type: String,
    enum: ['PLANIFIEE', 'TENUE', 'ANNULEE'],
    default: 'PLANIFIEE',
  },
  compteRendu: { type: String },
  creeParUtilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
  },
}, { timestamps: true });

module.exports = mongoose.model('Reunion', reunionSchema);
