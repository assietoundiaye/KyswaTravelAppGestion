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
    prix: {
      type: Number,
      required: [true, 'Le prix du billet est obligatoire'],
      min: [0, 'Le prix doit être positif'],
    },
  },
  { timestamps: true }
);

billetSchema.set('toJSON', { virtuals: true });
billetSchema.set('toObject', { virtuals: true });

// Virtual : resteAPayer
billetSchema.virtual('resteAPayer').get(function () {
  const totalPaye = this.paiements
    ? this.paiements.reduce((sum, paiement) => {
        const montant = paiement.montant ? parseFloat(paiement.montant.toString()) : 0;
        return sum + montant;
      }, 0)
    : 0;

  return this.prix - totalPaye;
});

// Méthode : mettre à jour le statut de paiement basé sur resteAPayer
billetSchema.methods.mettreAJourStatutPaiement = async function () {
  if (this.resteAPayer <= 0) {
    this.statut = 'PAYE';
  }
  await this.save();
};

// Virtual pour compter les documents en attente
billetSchema.virtual('documentsEnAttenteCount', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'billetId',
  count: true,
  match: { statut: 'EN_ATTENTE' }
});

// Virtual pour compter tous les documents
billetSchema.virtual('documentsCount', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'billetId',
  count: true
});

// Inclure les virtuals dans les réponses JSON
billetSchema.set('toJSON', { virtuals: true });
billetSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Billet', billetSchema);
