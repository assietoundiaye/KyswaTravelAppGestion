const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Le mot de passe est requis'],
      select: false,// Le mot de passe ne sera pas inclus par défaut dans les recherches 
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

// Méthode pour comparer le password lors du login
utilisateurSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Hook pour hasher le password avant save si modifié
utilisateurSchema.pre('save', async function() {
    // Si le mot de passe n'est pas modifié, on s'arrête là
    if (!this.isModified('password')) return;

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        throw error; // Mongoose attrapera l'erreur tout seul
    }
});
// Ne pas exposer le password et __v dans les réponses JSON
utilisateurSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});
module.exports = mongoose.model('Utilisateur', utilisateurSchema);
