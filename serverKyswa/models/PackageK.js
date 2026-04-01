const mongoose = require('mongoose');

const packageKSchema = new mongoose.Schema(
  {
    idPackageK: {
      type: Number,
      unique: true,
      sparse: true,
    },
    nomReference: {
      type: String,
      required: [true, 'Le nom de référence est requis'],
      trim: true,
      unique: true,
    },

    // Type de service enrichi
    type: {
      type: String,
      enum: {
        values: ['OUMRA', 'HAJJ', 'ZIAR_FES', 'ZIARRA', 'TOURISME', 'BILLET'],
        message: 'Le type doit être OUMRA, HAJJ, ZIAR_FES, ZIARRA, TOURISME ou BILLET',
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

    dateDepart: { type: Date, required: [true, 'La date de départ est requise'] },
    dateRetour: { type: Date, required: [true, 'La date de retour est requise'] },

    // Prix par type de chambre
    prixSingle: { type: mongoose.Decimal128, get: (v) => v ? v.toString() : null },
    prixDouble: { type: mongoose.Decimal128, get: (v) => v ? v.toString() : null },
    prixTriple: { type: mongoose.Decimal128, get: (v) => v ? v.toString() : null },
    prixQuadruple: { type: mongoose.Decimal128, get: (v) => v ? v.toString() : null },

    // Anciens champs conservés
    prixEco: { type: mongoose.Decimal128, get: (v) => v ? v.toString() : null },
    prixCont: { type: mongoose.Decimal128, get: (v) => v ? v.toString() : null },
    prixVip: { type: mongoose.Decimal128, get: (v) => v ? v.toString() : null },

    hotel: [String],
    quotaMax: { type: Number, required: [true, 'Le quota maximum est requis'] },
    placesReservees: { type: Number, default: 0 },

    // Informations vol
    compagnieAerienne: { type: String },
    numeroVol: { type: String },
    villeDepart: { type: String },
    villeArrivee: { type: String },

    // Checklist pré-départ
    checklist: {
      visaOK: { type: Boolean, default: false },
      billetsOK: { type: Boolean, default: false },
      santeOK: { type: Boolean, default: false },
      bagagesOK: { type: Boolean, default: false },
    },

    dateCreation: { type: Date, default: Date.now },
    creeParUtilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    supplements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Supplement' }],
  },
  { timestamps: true }
);

packageKSchema.methods.verifierDispo = function (quantite) {
  return quantite <= (this.quotaMax - this.placesReservees);
};

packageKSchema.methods.calculerPlacesRestantes = function () {
  return this.quotaMax - this.placesReservees;
};

// Prix selon type de chambre
packageKSchema.methods.getPrixChambre = function (typeChambre) {
  const map = {
    SINGLE: this.prixSingle,
    DOUBLE: this.prixDouble,
    TRIPLE: this.prixTriple,
    QUADRUPLE: this.prixQuadruple,
  };
  return map[typeChambre] || this.prixEco || null;
};

module.exports = mongoose.model('PackageK', packageKSchema);
