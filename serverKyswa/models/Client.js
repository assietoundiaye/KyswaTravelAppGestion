const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    numeroPasseport: {
      type: String,
      required: [true, 'Le numéro de passeport est requis'],
      unique: true,
      trim: true,
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
    dateNaissance: {
      type: Date,
    },
    lieuNaissance: {
      type: String,
    },
    telephone: {
      type: String,
      validate: {
        validator: function (v) {
          // Regex simple pour Sénégal: +221 suivi de 9 chiffres, ou 77/78/70 suivi de 8 chiffres
          return /^(\+221|0)(7[0-8]|70)\d{7}$/.test(v);
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
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'L\'email doit être valide',
      },
    },
    adresse: {
      type: String,
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

module.exports = mongoose.model('Client', clientSchema);
