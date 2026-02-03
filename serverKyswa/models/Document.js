const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    idDocument: {
      type: Number,
      required: [true, 'L\'ID du document est requis'],
      unique: true,
    },
    dateCreation: {
      type: Date,
      default: Date.now,
    },
    creeParUtilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    type: {
      type: String,
      enum: {
        values: ['PASSEPORT', 'VISA', 'CNI', 'CERTIFICAT_VACCINATION', 'AUTRE'],
        message: 'Le type de document doit être l\'un de: PASSEPORT, VISA, CNI, CERTIFICAT_VACCINATION, AUTRE',
      },
    },
    cheminFichier: {
      type: String,
      required: [true, 'Le chemin du fichier est requis'],
    },
    statut: {
      type: String,
      enum: {
        values: ['EN_ATTENTE', 'VALIDE', 'REFUSE', 'EXPIREE'],
        message: 'Le statut doit être EN_ATTENTE, VALIDE, REFUSE ou EXPIREE',
      },
      default: 'EN_ATTENTE',
    },
  },
  { timestamps: true }
);

// Méthodes d'instance
documentSchema.methods.valider = function () {
  if (this.statut === 'EN_ATTENTE') {
    this.statut = 'VALIDE';
    return this.save();
  }
  throw new Error('Seuls les documents en attente peuvent être validés');
};

module.exports = mongoose.model('Document', documentSchema);
