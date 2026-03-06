const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    idDocument: {
      type: Number,
      required: [true, 'L\'ID du document est requis'],
      unique: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: false,
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: false,
    },
    billetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Billet',
      required: false,
    },
    type: {
      type: String,
      enum: {
        values: ['PASSEPORT', 'VISA', 'BILLET_ELECTRONIQUE', 'CERTIFICAT', 'AUTRE'],
        message: 'Le type de document doit être l\'un de: PASSEPORT, VISA, BILLET_ELECTRONIQUE, CERTIFICAT, AUTRE',
      },
      required: [true, 'Le type du document est requis'],
    },
    cheminFichier: {
      type: String,
      required: [true, 'Le chemin du fichier est requis'],
    },
    publicId: {
      type: String,
    },
    statut: {
      type: String,
      enum: {
        values: ['EN_ATTENTE', 'VALIDE', 'REFUSE', 'EXPIREE'],
        message: 'Le statut doit être EN_ATTENTE, VALIDE, REFUSE ou EXPIREE',
      },
      default: 'EN_ATTENTE',
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

// custom validation: exactly one of clientId, reservationId, billetId
documentSchema.pre('validate', async function() {
  const count = [this.clientId, this.reservationId, this.billetId].filter(id => !!id).length;
  if (count !== 1) {
    throw new Error('Le document doit être associé à exactement un client, une réservation ou un billet');
  }
});

// Méthodes d'instance
documentSchema.methods.valider = function () {
  if (this.statut === 'EN_ATTENTE') {
    this.statut = 'VALIDE';
    return this.save();
  }
  throw new Error('Seuls les documents en attente peuvent être validés');
};

module.exports = mongoose.model('Document', documentSchema);
