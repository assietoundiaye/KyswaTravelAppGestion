const mongoose = require('mongoose');

const packageKSchema = new mongoose.Schema(
  {
    idPackageK: {
      type: Number,
      required: [true, 'L\'ID du package est requis'],
      unique: true,
    },
    nomReference: {
      type: String,
      required: [true, 'Le nom de référence est requis'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['OUMRA', 'HAJJ', 'ZIAR_FES', 'TOURISME'],
        message: 'Le type doit être OUMRA, HAJJ, ZIAR_FES ou TOURISME',
      },
    },
    statut: {
      type: String,
      enum: {
        values: ['OUVERT', 'COMPLET', 'ANNULE', 'TERMINE'],
        message: 'Le statut doit être OUVERT, COMPLET, ANNULE ou TERMINE',
      },
      default: 'OUVERT',
    },
    dateDepart: {
      type: Date,
      required: [true, 'La date de départ est requise'],
    },
    dateRetour: {
      type: Date,
      required: [true, 'La date de retour est requise'],
    },
    prixEco: {
      type: mongoose.Decimal128,
      get: (value) => (value ? value.toString() : null),
    },
    prixCont: {
      type: mongoose.Decimal128,
      get: (value) => (value ? value.toString() : null),
    },
    prixVip: {
      type: mongoose.Decimal128,
      get: (value) => (value ? value.toString() : null),
    },
    hotel: [String],
    quotaMax: {
      type: Number,
      required: [true, 'Le quota maximum est requis'],
    },
    placesReservees: {
      type: Number,
      default: 0,
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

// Méthodes d'instance
packageKSchema.methods.verifierDispo = function (quantite) {
  const placesDisponibles = this.quotaMax - this.placesReservees;
  return quantite <= placesDisponibles;
};

packageKSchema.methods.calculerPlacesRestantes = function () {
  return this.quotaMax - this.placesReservees;
};

module.exports = mongoose.model('PackageK', packageKSchema);
