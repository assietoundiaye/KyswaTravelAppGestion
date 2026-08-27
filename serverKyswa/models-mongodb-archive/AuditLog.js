const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
  },
  userNom: { type: String },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW'],
  },
  module: {
    type: String,
    required: true,
    enum: ['CLIENT', 'RESERVATION', 'BILLET', 'PAIEMENT', 'PACKAGE', 'SUPPLEMENT', 'DOCUMENT', 'UTILISATEUR', 'AUTH', 'RAPPORTS'],
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: false });

module.exports = mongoose.model('AuditLog', auditLogSchema);
