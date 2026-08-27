const mongoose = require('mongoose');

const supplementSchema = new mongoose.Schema(
  {
    idSupplement: {
      type: Number,
      required: [true, 'L\'ID du supplément est requis'],
      unique: true,
    },
    nom: {
      type: String,
      required: [true, 'Le nom du supplément est requis'],
      trim: true,
    },
    prix: {
      type: mongoose.Decimal128,
      required: [true, 'Le prix est requis'],
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

module.exports = mongoose.model('Supplement', supplementSchema);
