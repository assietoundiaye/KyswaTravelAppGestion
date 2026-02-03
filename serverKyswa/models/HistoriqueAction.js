const mongoose = require('mongoose');

const historiqueActionSchema = new mongoose.Schema(
  {
    idHistoriqueAction: {
      type: Number,
      required: [true, "L'ID de l'historique d'action est requis"],
      unique: true,
    },
    dateAction: {
      type: Date,
      required: [true, "La date de l'action est requise"],
    },
    typeAction: {
      type: String,
      trim: true,
    },
    entiteVisee: {
      type: String,
      trim: true,
    },
    detailsModif: {
      type: String,
      trim: true,
    },
    ParUtilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, "L'utilisateur responsable est requis"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HistoriqueAction', historiqueActionSchema);
