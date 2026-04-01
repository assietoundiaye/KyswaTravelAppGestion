const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    // Identité
    numeroPasseport: {
      type: String,
      required: [true, 'Le numéro de passeport est requis'],
      unique: true,
      trim: true,
    },
    dateExpirationPasseport: {
      type: Date,
    },
    numeroCNI: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    nom: {
      type: String,
      required: [true, 'Le nom est requis'],
      trim: true,
    },
    prenom: {
      type: String,
      required: [true, 'Le prénom est requis'],
      trim: true,
    },
    dateNaissance: { type: Date },
    lieuNaissance: { type: String },
    telephone: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true; // optionnel
          return /^(\+221|0)?(7[0-8]|70)\d{7}$/.test(v);
        },
        message: 'Le numéro de téléphone doit être valide (format Sénégal)',
      },
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "L'email doit être valide",
      },
    },
    adresse: { type: String },

    // Niveau fidélité
    niveauFidelite: {
      type: String,
      enum: ['BRONZE', 'ARGENT', 'OR', 'PLATINE'],
      default: 'BRONZE',
    },

    // Référent (agent qui a amené le client)
    referentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },

    // Visas détenus
    visasDetenuts: [{
      type: {
        type: String,
        enum: ['SCHENGEN', 'USA', 'UK', 'CANADA', 'AUTRE'],
      },
      dateExpiration: Date,
      numero: String,
    }],

    // Historique voyages Hajj/Oumra
    historiqueVoyages: [{
      type: {
        type: String,
        enum: ['HAJJ', 'OUMRA', 'ZIARRA', 'AUTRE'],
      },
      annee: Number,
      agence: String,
      notes: String,
    }],

    // Métadonnées
    dateCreation: { type: Date, default: Date.now },
    creeParUtilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
  },
  { timestamps: true }
);

// Virtuals documents
clientSchema.virtual('documentsEnAttenteCount', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'clientId',
  count: true,
  match: { statut: 'EN_ATTENTE' }
});
clientSchema.virtual('documentsCount', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'clientId',
  count: true
});

clientSchema.set('toJSON', { virtuals: true });
clientSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Client', clientSchema);
