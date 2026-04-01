const mongoose = require('mongoose');

// Enregistrement d'une relance téléphonique pour recouvrement
const relanceSchema = new mongoose.Schema({
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
  dateRelance: {
    type: Date,
    default: Date.now,
  },
  notes: { type: String },
  resultat: {
    type: String,
    enum: ['JOINT', 'NON_JOINT', 'PROMESSE_PAIEMENT', 'REFUSE'],
    default: 'JOINT',
  },
  dateProchaineRelance: { type: Date },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
  },
}, { timestamps: true });

module.exports = mongoose.model('Relance', relanceSchema);
