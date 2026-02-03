const mongoose = require('mongoose');

const utilisateurSchema = new mongoose.Schema(
  {
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
    email: {
      type: String,
      required: [true, 'L\'email est requis'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'L\'email doit être valide',
      },
    },
    telephone: {
      type: String,
    },
    password: {
      type: String,
      required: [true, 'Le mot de passe est requis'],
    },
    role: {
      type: String,
      enum: {
        values: ['ADMIN', 'GESTIONNAIRE', 'COMMERCIAL', 'COMPTABLE'],
        message: 'Le rôle doit être l\'un de: ADMIN, GESTIONNAIRE, COMMERCIAL, COMPTABLE',
      },
      required: [true, 'Le rôle est requis'],
    },
    etat: {
      type: String,
      enum: {
        values: ['ACTIF', 'INACTIF'],
        message: 'L\'état doit être ACTIF ou INACTIF',
      },
      default: 'ACTIF',
    },
    dateCreation: {
      type: Date,
      default: Date.now,
    },
    dateDerniereConnexion: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Méthodes d'instance
utilisateurSchema.methods.seConnecter = function () {
  this.dateDerniereConnexion = new Date();
  return this.save();
};

utilisateurSchema.methods.seDeconnecter = function () {
  // Logique de déconnexion si nécessaire
  return Promise.resolve();
};

utilisateurSchema.methods.modifierProfil = function (donnees) {
  const champsModifiables = ['nom', 'prenom', 'telephone'];
  champsModifiables.forEach((champ) => {
    if (donnees[champ]) {
      this[champ] = donnees[champ];
    }
  });
  return this.save();
};

utilisateurSchema.methods.detailsModif = function (donnees) {
  // Retourne les détails des modifications apportées
  const modifications = {};
  const champsModifiables = ['nom', 'prenom', 'telephone'];
  
  champsModifiables.forEach((champ) => {
    if (donnees[champ] && donnees[champ] !== this[champ]) {
      modifications[champ] = {
        ancienne: this[champ],
        nouvelle: donnees[champ],
        dateModification: new Date(),
      };
    }
  });
  
  return modifications;
};

module.exports = mongoose.model('Utilisateur', utilisateurSchema);
