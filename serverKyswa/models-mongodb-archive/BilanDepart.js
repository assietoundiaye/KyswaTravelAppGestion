const mongoose = require('mongoose');

const bilanDepartSchema = new mongoose.Schema({
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PackageK',
    required: true
  },
  nomReference: {
    type: String,
    required: true
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    required: true
  },
  roleCreateur: {
    type: String,
    required: true
  },
  commentaires: {
    type: String,
    default: ''
  },
  observations: {
    type: String,
    default: ''
  },
  actionsSuivi: [{
    type: String
  }],
  statut: {
    type: String,
    enum: ['ACTIF', 'ARCHIVE', 'ANNULE'],
    default: 'ACTIF'
  },
  dateModification: {
    type: Date,
    default: Date.now
  },
  modifiePar: {
    type: String
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances de recherche
bilanDepartSchema.index({ packageId: 1 });
bilanDepartSchema.index({ dateCreation: -1 });
bilanDepartSchema.index({ statut: 1 });

module.exports = mongoose.model('BilanDepart', bilanDepartSchema);