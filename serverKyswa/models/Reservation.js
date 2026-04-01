const mongoose = require('mongoose');

// Compteur pour numéro auto INS-YYYY-NNN
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

async function getNextNumero() {
  const year = new Date().getFullYear();
  const counterId = `inscription_${year}`;
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `INS-${year}-${String(counter.seq).padStart(3, '0')}`;
}

const reservationSchema = new mongoose.Schema(
  {
    // Numéro unique auto-généré (INS-2026-001)
    numero: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Ancien champ conservé pour rétrocompatibilité
    idReservation: {
      type: Number,
      unique: true,
      sparse: true,
    },

    nombrePlaces: {
      type: Number,
      required: [true, 'Le nombre de places est requis'],
      min: [1, 'Le nombre de places doit être au moins 1'],
    },

    // Type de chambre (nouveau)
    typeChambre: {
      type: String,
      enum: ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUADRUPLE', 'SUITE'],
    },

    formule: {
      type: String,
      enum: [
        'LOGEMENT_SEUL', 'LOGEMENT_PETIT_DEJEUNER', 'DEMI_PENSION',
        'PENSION_COMPLETE', 'ALL_INCLUSIVE', 'ALL_INCLUSIVE_PREMIUM',
      ],
    },
    niveauConfort: {
      type: String,
      enum: ['ECO', 'CONFORT', 'VIP'],
    },

    dateDepart: { type: Date, required: [true, 'La date de départ est requise'] },
    dateRetour: { type: Date, required: [true, 'La date de retour est requise'] },

    montantTotalDu: {
      type: Number,
      required: [true, 'Le montant total est requis'],
    },

    // Statuts séparés selon le diagramme de classe
    // statut_client : état du pèlerin dans le voyage
    statutClient: {
      type: String,
      enum: {
        values: ['INSCRIT', 'CONFIRME', 'DESISTE', 'PARTI', 'RENTRE', 'ANNULE'],
        message: 'Statut client invalide',
      },
      default: 'INSCRIT',
    },

    // statut_paiement : état financier de l'inscription
    statutPaiement: {
      type: String,
      enum: {
        values: ['EN_ATTENTE', 'PARTIEL', 'SOLDE'],
        message: 'Statut paiement invalide',
      },
      default: 'EN_ATTENTE',
    },

    // Ancien champ conservé pour rétrocompatibilité
    statut: {
      type: String,
      enum: {
        values: ['EN_ATTENTE', 'INSCRIT', 'CONFIRME', 'PARTIEL', 'SOLDE', 'ANNULEE', 'PAYEE', 'DESISTE', 'PARTI', 'RENTRE'],
        message: 'Statut invalide',
      },
      default: 'INSCRIT',
    },

    statutCreation: { type: Date, default: Date.now },
    creeParUtilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    packageKId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PackageK',
      required: [true, 'Le package est requis'],
    },
    clients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
    paiements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Paiement' }],

    // Notes internes
    notes: { type: String },
  },
  { timestamps: true }
);

// Hook pre-save : générer numéro auto si absent
reservationSchema.pre('save', async function () {
  if (!this.numero) {
    this.numero = await getNextNumero();
  }
  if (!this.idReservation) {
    this.idReservation = Date.now();
  }
});

// Virtual resteAPayer
reservationSchema.virtual('resteAPayer').get(function () {
  const totalPaye = this.paiements
    ? this.paiements.reduce((sum, p) => {
        const montant = p.montant ? parseFloat(p.montant.toString()) : 0;
        return sum + montant;
      }, 0)
    : 0;
  return this.montantTotalDu - totalPaye;
});

// Méthode : mettre à jour statut selon paiements
reservationSchema.methods.mettreAJourStatutPaiement = async function () {
  await this.populate('paiements');
  const totalPaye = this.paiements.reduce((s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0), 0);
  const reste = this.montantTotalDu - totalPaye;

  if (reste <= 0) {
    this.statutPaiement = 'SOLDE';
    this.statut = 'SOLDE';
  } else if (totalPaye > 0) {
    this.statutPaiement = 'PARTIEL';
    this.statut = 'PARTIEL';
  } else {
    this.statutPaiement = 'EN_ATTENTE';
  }
  await this.save();
};

// Virtuals documents
reservationSchema.virtual('documentsEnAttenteCount', {
  ref: 'Document', localField: '_id', foreignField: 'reservationId', count: true, match: { statut: 'EN_ATTENTE' }
});
reservationSchema.virtual('documentsCount', {
  ref: 'Document', localField: '_id', foreignField: 'reservationId', count: true
});

reservationSchema.set('toJSON', { virtuals: true });
reservationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Reservation', reservationSchema);
