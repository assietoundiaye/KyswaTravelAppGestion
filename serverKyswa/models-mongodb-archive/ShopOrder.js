const mongoose = require('mongoose');

const shopOrderItemSchema = new mongoose.Schema({
  produitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit',
    required: true,
  },
  nomProduit: { type: String, required: true },
  quantite: { type: Number, required: true, min: 1 },
  prixUnitaire: { type: Number, required: true, min: 0 },
  sousTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const shopOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
  },
  items: [shopOrderItemSchema],
  montantTotal: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['EN_ATTENTE_PAIEMENT', 'PAYE', 'ANNULEE'],
    default: 'EN_ATTENTE_PAIEMENT',
  },
  payment: {
    montant: Number,
    mode: String,
    reference: String,
    dateReglement: Date,
    paiementId: mongoose.Schema.Types.ObjectId,
  },
  notes: String,
  paidAt: Date,
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
  },
  cancellation: {
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    motif: String,
    action: String,
  },
}, { timestamps: true });


// Hooks
shopOrderSchema.pre('save', function() {
  // Générer un numéro de commande unique si pas défini
  if (!this.orderNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `SHOP-${timestamp}-${random}`;
  }
});

module.exports = mongoose.model('ShopOrder', shopOrderSchema);
