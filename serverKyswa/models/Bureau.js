const mongoose = require('mongoose');

const bureauSchema = new mongoose.Schema(
  {
    idBureau: {
      type: Number,
    },
    nom: {
      type: String,
      trim: true,
    },
    adresse: {
      type: String,
      trim: true,
    },
    telephone: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bureau', bureauSchema);
