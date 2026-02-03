const mongoose = require('mongoose');

const configurationPeriodeSchema = new mongoose.Schema(
  {
    idConfigurationPeriode: {
      type: Number,
    },
    type: {
      type: String,
      enum: {
        values: ['OUMRA', 'HAJJ', 'ZIAR_FES', 'TOURISME'],
        message: 'Le type doit être OUMRA, HAJJ, ZIAR_FES ou TOURISME',
      },
    },
    mois: {
      type: Number,
      min: [1, 'Le mois doit être entre 1 et 12'],
      max: [12, 'Le mois doit être entre 1 et 12'],
    },
    prixBaseGrille: {
      type: mongoose.Decimal128,
      get: (value) => (value ? value.toString() : null),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ConfigurationPeriode', configurationPeriodeSchema);
