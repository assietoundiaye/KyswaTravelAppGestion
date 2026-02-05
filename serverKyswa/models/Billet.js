const mongoose = require('mongoose');

const billetSchema = new mongoose.Schema(
  {
    idBillet: {
      type: Number,
      required: [true, 'L\'ID du billet est obligatoire'],
      unique: true,
    },
    numeroBillet: {
      type: String,
      required: [true, 'Le numéro de billet est obligatoire'],
      unique: true,
      trim: true,
    },
    compagnie: {
      type: String,
      required: [true, 'La compagnie est obligatoire'],
      trim: true,
    },
    classe: {
      type: String,
      required: [true, 'La classe est obligatoire'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'La destination est obligatoire'],
      trim: true,
    },
    typeBillet: {
      type: String,
      enum: ['aller_simple', 'aller_retour'],
      required: [true, 'Le type de billet est obligatoire'],
    },
    dateDepart: {
      type: Date,
      required: [true, 'La date de départ est obligatoire'],
    },
    dateArrivee: {
      type: Date,
      required: [true, 'La date d\'arrivée est obligatoire'],
    },
    statut: {
      type: String,
      required: [true, 'Le statut est obligatoire'],
      trim: true,
    },
    dateCreation: {
      type: Date,
      default: Date.now,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Le client est obligatoire'],
    },
    paiements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paiement',
      },
    ],
  },
  { timestamps: true }
);

/**
 * Méthode optionnelle : générer une facture (placeholder)
 */
billetSchema.methods.genererFacture = function () {
  return {
    idBillet: this.idBillet,
    numeroBillet: this.numeroBillet,
    compagnie: this.compagnie,
    classe: this.classe,
    dateDepart: this.dateDepart,
    dateArrivee: this.dateArrivee,
    statut: this.statut,
    clientId: this.clientId,
    generatedAt: new Date(),
  };
};

module.exports = mongoose.model('Billet', billetSchema);
