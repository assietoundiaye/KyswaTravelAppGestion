const mongoose = require('mongoose');

const depenseSchema = new mongoose.Schema({
  categorie: {
    type: String,
    enum: ['LOYER', 'SALAIRES', 'FOURNITURES', 'TRANSPORT', 'COMMUNICATION', 'MARKETING', 'TAXES', 'AUTRE'],
    required: true,
  },
  montant: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true },
  dateDepense: { type: Date, required: true, default: Date.now },
  justificatif: { type: String }, // URL Cloudinary
  creeParUtilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
  },
}, { timestamps: true });

module.exports = mongoose.model('Depense', depenseSchema);
