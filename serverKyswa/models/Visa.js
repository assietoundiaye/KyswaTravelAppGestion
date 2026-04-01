const mongoose = require('mongoose');

const visaSchema = new mongoose.Schema({
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
  statut: {
    type: String,
    enum: ['EN_ATTENTE_PASSEPORT', 'PASSEPORT_RECU', 'ENVOYE_PLATEFORME', 'VISA_RECU', 'REFUSE'],
    default: 'EN_ATTENTE_PASSEPORT',
  },
  dateEnvoi: { type: Date },
  dateReception: { type: Date },
  motifRefus: { type: String },
  notes: { type: String },
  creeParUtilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
  },
}, { timestamps: true });

module.exports = mongoose.model('Visa', visaSchema);
