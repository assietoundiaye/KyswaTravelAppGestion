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
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: [true, 'La réservation est requise'],
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Le client est requis'],
    },
    supplementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplement',
      required: [true, 'Le supplément est requis'],
    },
    prixUnitaire: {
      type: Number,
      required: [true, 'Le prix unitaire est requis'],
      min: [0, 'Le prix unitaire doit être positif'],
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
