const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  expediteurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
  },
  destinataireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
  },
  contenu: {
    type: String,
    required: [true, 'Le contenu est requis'],
    trim: true,
  },
  lu: {
    type: Boolean,
    default: false,
  },
  luAt: {
    type: Date,
  },
}, { timestamps: true });

messageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Message', messageSchema);
