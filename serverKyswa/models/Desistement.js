const mongoose = require('mongoose');

// Grille de remboursement selon la documentation officielle
// 60j+ → 100%, 30-59j → 80%, 15-29j → 50%, 1-14j → 25%, 0j → 0%
function calculerTauxRemboursement(joursAvantDepart) {
  if (joursAvantDepart >= 60) return 100;
  if (joursAvantDepart >= 30) return 80;
  if (joursAvantDepart >= 15) return 50;
  if (joursAvantDepart > 0) return 25;
  return 0;
}

const desistementSchema = new mongoose.Schema({
  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  dateAnnulation: {
    type: Date,
    required: true,
    default: Date.now,
  },
  dateDepart: {
    type: Date,
    required: true,
  },
  joursAvantDepart: {
    type: Number,
  },
  tauxRemboursement: {
    type: Number, // pourcentage 0-100
  },
  montantPaye: {
    type: Number,
    required: true,
  },
  montantRembourse: {
    type: Number,
  },
  motif: { type: String },
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'REMBOURSE', 'ANNULE'],
    default: 'EN_ATTENTE',
  },
  dateRemboursement: { type: Date },
  creeParUtilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
  },
}, { timestamps: true });

// Hook pre-save : calcul automatique
desistementSchema.pre('save', function () {
  if (this.dateAnnulation && this.dateDepart) {
    const diff = Math.floor((new Date(this.dateDepart) - new Date(this.dateAnnulation)) / (1000 * 60 * 60 * 24));
    this.joursAvantDepart = Math.max(0, diff);
    this.tauxRemboursement = calculerTauxRemboursement(this.joursAvantDepart);
    this.montantRembourse = Math.round((this.montantPaye * this.tauxRemboursement) / 100);
  }
});

module.exports = mongoose.model('Desistement', desistementSchema);
