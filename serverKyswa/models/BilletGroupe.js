const mongoose = require('mongoose');

const billetGroupeSchema = new mongoose.Schema({
  packageKId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PackageK',
    required: true,
  },
  compagnie: { type: String, required: true, trim: true },
  numeroVol: { type: String, required: true, trim: true },
  dateDepart: { type: Date, required: true },
  dateArrivee: { type: Date, required: true },
  villeDepart: { type: String, required: true },
  villeArrivee: { type: String, required: true },
  nombreSieges: { type: Number, required: true, min: 1 },
  prixUnitaire: { type: Number, required: true, min: 0 },
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'CONFIRME', 'ANNULE'],
    default: 'EN_ATTENTE',
  },
  notes: { type: String },
  creeParUtilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
  },
}, { timestamps: true });

module.exports = mongoose.model('BilletGroupe', billetGroupeSchema);
