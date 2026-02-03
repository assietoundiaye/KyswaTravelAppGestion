const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    idReservation: {
      type: Number,
      required: [true, 'L\'ID de réservation est requis'],
      unique: true,
    },
    nombrePlaces: {
      type: Number,
      required: [true, 'Le nombre de places est requis'],
      min: [1, 'Le nombre de places doit être au moins 1'],
    },
    formule: {
      type: String,
      enum: {
        values: [
          'LOGEMENT_SEUL',
          'LOGEMENT_PETIT_DEJEUNER',
          'DEMI_PENSION',
          'PENSION_COMPLETE',
          'ALL_INCLUSIVE',
          'ALL_INCLUSIVE_PREMIUM',
        ],
        message:
          'La formule doit être l\'une de: LOGEMENT_SEUL, LOGEMENT_PETIT_DEJEUNER, DEMI_PENSION, PENSION_COMPLETE, ALL_INCLUSIVE, ALL_INCLUSIVE_PREMIUM',
      },
    },
    niveauConfort: {
      type: String,
      enum: {
        values: ['ECO', 'CONFORT', 'VIP'],
        message: 'Le niveau de confort doit être ECO, CONFORT ou VIP',
      },
    },
    dateDepart: {
      type: Date,
      required: [true, 'La date de départ est requise'],
    },
    dateRetour: {
      type: Date,
      required: [true, 'La date de retour est requise'],
    },
    montantTotalDu: {
      type: Number,
      required: [true, 'Le montant total est requis'],
    },
    statut: {
      type: String,
      enum: {
        values: ['EN_ATTENTE', 'CONFIRMEE', 'PAYEE', 'ANNULEE'],
        message: 'Le statut doit être EN_ATTENTE, CONFIRMEE, PAYEE ou ANNULEE',
      },
      default: 'EN_ATTENTE',
    },
    statutCreation: {
      type: Date,
      default: Date.now,
    },
    creeParUtilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    packageKId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PackageK',
      required: [true, 'Le package est requis'],
    },
    clients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
      },
    ],
    paiements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paiement',
      },
    ],
  },
  { timestamps: true }
);

// Méthodes d'instance
// models/Reservation.js

reservationSchema.methods.calculerResteAPayer = async function () {
  await this.populate('paiements');
  
  const sommePaiements = this.paiements.reduce((total, paiement) => {
    // Convertir Decimal128 en nombre pour le calcul
    const montantNum = paiement.montant ? parseFloat(paiement.montant.toString()) : 0;
    return total + montantNum;
  }, 0);
  
  return this.montantTotalDu - sommePaiements;
};

reservationSchema.methods.mettreAJourStatutPaiement = async function () {
  const resteAPayer = await this.calculerResteAPayer();
  
  if (resteAPayer <= 0) {
    this.statut = 'PAYEE';
  } else if (resteAPayer < this.montantTotalDu) {
    this.statut = 'CONFIRMEE';
  }
  
  return this.save();
};

reservationSchema.methods.verifierDispo = function (quantite) {
  // Vérifie si la quantité demandée est disponible
  // Cette logique dépendra de votre implémentation du package
  return quantite <= this.nombrePlaces;
};

module.exports = mongoose.model('Reservation', reservationSchema);
