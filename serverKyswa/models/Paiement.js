const mongoose = require('mongoose');

const paiementSchema = new mongoose.Schema(
{
idPaiement: {
type: Number,
required: [true, 'L\'ID de paiement est requis'],
unique: true,
},
montant: {
type: mongoose.Decimal128,
required: [true, 'Le montant est requis'],
get: (value) => (value ? value.toString() : null),
},
dateReglement: {
type: Date,
required: [true, 'La date de règlement est requise'],
},
mode: {
type: String,
enum: {
values: [
'CARTE_BANCAIRE',
'VIREMENT',
'ORANGE_MONEY',
'WAVE',
'MONEY',
'ESPECES',
'AUTRE',
],
message:
'Le mode doit être l\'un de: CARTE_BANCAIRE, VIREMENT, ORANGE_MONEY, WAVE, MONEY, ESPECES, AUTRE',
},
required: [true, 'Le mode de paiement est requis'],
},
reference: {
type: String,
trim: true,
},
creeParUtilisateurId: {
type: mongoose.Schema.Types.ObjectId,
ref: 'Utilisateur',
},
dateCreation: {
type: Date,
default: Date.now,
},
},
{ timestamps: true }
);

// Méthodes d'instance
paiementSchema.methods.genererFacture = function () {
// Génère une facture basée sur le paiement
const facture = {
numeroPaiement: this.idPaiement,
montant: this.montant.toString(),
dateReglement: this.dateReglement,
mode: this.mode,
reference: this.reference,
dateGeneration: new Date(),
statut: 'GENEREE',
};
return facture;
};

module.exports = mongoose.model('Paiement', paiementSchema);
