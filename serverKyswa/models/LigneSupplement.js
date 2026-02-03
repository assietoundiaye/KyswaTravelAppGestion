const mongoose = require('mongoose');

const ligneSupplementSchema = new mongoose.Schema(
  {
    idLigneSupplement: {
      type: Number,
      required: [true, 'L\'ID de la ligne supplémentaire est requis'],
      unique: true,
    },
    quantite: {
      type: Number,
      required: [true, 'La quantité est requise'],
      min: [1, 'La quantité doit être au moins 1'],
    },
    prixUnitaire: {
      type: mongoose.Decimal128,
      required: [true, 'Le prix unitaire est requis'],
      get: (value) => (value ? value.toString() : null),
    },
    dateCreation: {
      type: Date,
      default: Date.now,
    },
    creeParUtilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LigneSupplement', ligneSupplementSchema);
