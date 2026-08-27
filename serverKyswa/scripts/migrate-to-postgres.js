/**
 * @fileoverview Script de migration de MongoDB vers PostgreSQL (Supabase)
 * Lit les données depuis MongoDB et les insère proprement dans PostgreSQL via Prisma.
 * Supporte le mode "--dry-run" et protège les données existantes.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const prisma = require('../src/database/client');
const { Prisma } = require('@prisma/client');

// Importation de tous les modèles Mongoose
const Utilisateur = require('../models/Utilisateur');
const Client = require('../models/Client');
const Counter = require('../models/Reservation').Counter; // Note: Counter est défini dans Reservation.js
const BilletCounter = require('../models/Billet').BilletCounter; // Note: BilletCounter est défini dans Billet.js
const Supplement = require('../models/Supplement');
const PackageK = require('../models/PackageK');
const Produit = require('../models/Produit');
const StockMovement = require('../models/StockMovement');
const ShopOrder = require('../models/ShopOrder');
const Reservation = require('../models/Reservation');
const Billet = require('../models/Billet');
const Paiement = require('../models/Paiement');
const Document = require('../models/Document');
const Desistement = require('../models/Desistement');
const Visa = require('../models/Visa');
const BilanDepart = require('../models/BilanDepart');
const Bureau = require('../models/Bureau');
const ConfigurationPeriode = require('../models/ConfigurationPeriode');
const Depense = require('../models/Depense');
const HistoriqueAction = require('../models/HistoriqueAction');
const Message = require('../models/Message');
const RapportQuotidien = require('../models/RapportQuotidien');
const Relance = require('../models/Relance');
const Reunion = require('../models/Reunion');
const ZiarraProspect = require('../models/ZiarraProspect');
const AuditLog = require('../models/AuditLog');
const BilletGroupe = require('../models/BilletGroupe');

const isDryRun = process.argv.includes('--dry-run');

console.log(`
================================================================
🚀 DEBUT DE LA MIGRATION MONGODB -> POSTGRESQL (SUPABASE)
${isDryRun ? '⚠️ MODE SIMULATION (DRY-RUN) ACTIF - AUCUN CHANGEMENT SUR SUPABASE' : '🔥 MODE EXECUTION - ECRITURE DANS SUPABASE'}
================================================================
`);

// Helpers pour les conversions de types
function toBigInt(val) {
  if (val === undefined || val === null) return null;
  try {
    return BigInt(Math.round(Number(val)));
  } catch (e) {
    return null;
  }
}

function toDecimal(val) {
  if (val === undefined || val === null) return null;
  return new Prisma.Decimal(val.toString());
}

function toStringId(val) {
  if (!val) return null;
  return val.toString();
}

async function run() {
  try {
    // 1. Connexion MongoDB Source
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI manquante dans les variables d'environnement");
    }
    console.log('🔄 Connexion à MongoDB Source...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB Source');

    // 2. Migration des collections dans l'ordre d'intégrité référentielle
    
    // --- 1. Utilisateurs ---
    await migrateCollection({
      name: 'Utilisateur',
      mongoModel: Utilisateur,
      prismaModel: prisma.utilisateur,
      mapFn: doc => ({
        id: toStringId(doc._id),
        nom: doc.nom,
        prenom: doc.prenom,
        email: doc.email,
        telephone: doc.telephone,
        password: doc.password,
        role: doc.role,
        etat: doc.etat || 'ACTIF',
        dateCreation: doc.dateCreation || doc.createdAt || new Date(),
        dateDerniereConnexion: doc.dateDerniereConnexion,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 2. Clients ---
    await migrateCollection({
      name: 'Client',
      mongoModel: Client,
      prismaModel: prisma.client,
      mapFn: doc => ({
        id: toStringId(doc._id),
        numeroPasseport: doc.numeroPasseport,
        dateExpirationPasseport: doc.dateExpirationPasseport,
        numeroCNI: doc.numeroCNI,
        nom: doc.nom,
        prenom: doc.prenom,
        dateNaissance: doc.dateNaissance,
        lieuNaissance: doc.lieuNaissance,
        sexe: doc.sexe,
        telephone: doc.telephone,
        email: doc.email,
        adresse: doc.adresse,
        niveauFidelite: doc.niveauFidelite || 'BRONZE',
        referentId: toStringId(doc.referentId),
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        visasDetenuts: doc.visasDetenuts ? doc.visasDetenuts : Prisma.JsonNull,
        historiqueVoyages: doc.historiqueVoyages ? doc.historiqueVoyages : Prisma.JsonNull,
        contactUrgenceNom: doc.contactUrgence ? doc.contactUrgence.nom : '',
        contactUrgenceTelephone: doc.contactUrgence ? doc.contactUrgence.telephone : '',
        contactUrgenceRelation: doc.contactUrgence ? doc.contactUrgence.relation : '',
        dateCreation: doc.dateCreation || doc.createdAt || new Date(),
        photoUrl: doc.photoUrl,
        photoPublicId: doc.photoPublicId,
        supprime: doc.supprime || false,
        dateSuppression: doc.dateSuppression,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 3. Compteurs ---
    // Note: On migre les compteurs depuis les modèles Mongoose s'ils existent
    await migrateCollection({
      name: 'Counter',
      mongoModel: mongoose.model('Counter'),
      prismaModel: prisma.counter,
      mapFn: doc => ({
        id: doc._id,
        seq: doc.seq || 0
      })
    });

    await migrateCollection({
      name: 'BilletCounter',
      mongoModel: mongoose.model('BilletCounter'),
      prismaModel: prisma.billetCounter,
      mapFn: doc => ({
        id: doc._id,
        seq: doc.seq || 0
      })
    });

    // --- 4. Supplements ---
    await migrateCollection({
      name: 'Supplement',
      mongoModel: Supplement,
      prismaModel: prisma.supplement,
      mapFn: doc => ({
        id: toStringId(doc._id),
        idSupplement: toBigInt(doc.idSupplement || Date.now()),
        nom: doc.nom,
        prix: toDecimal(doc.prix),
        dateCreation: doc.dateCreation || doc.createdAt || new Date(),
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 5. Packages ---
    await migrateCollection({
      name: 'PackageK',
      mongoModel: PackageK,
      prismaModel: prisma.packageK,
      mapFn: doc => ({
        id: toStringId(doc._id),
        idPackageK: toBigInt(doc.idPackageK),
        nomReference: doc.nomReference,
        type: doc.type,
        statut: doc.statut || 'OUVERT',
        dateDepart: doc.dateDepart,
        dateRetour: doc.dateRetour,
        prixEco: toDecimal(doc.prixEco),
        prixCont: toDecimal(doc.prixCont),
        prixVip: toDecimal(doc.prixVip),
        hotel: doc.hotel || [],
        quotaMax: doc.quotaMax || 0,
        placesReservees: doc.placesReservees || 0,
        compagnieAerienne: doc.compagnieAerienne,
        numeroVol: doc.numeroVol,
        villeDepart: doc.villeDepart,
        villeArrivee: doc.villeArrivee,
        checklistVisaOK: doc.checklist ? doc.checklist.visaOK : false,
        checklistBilletsOK: doc.checklist ? doc.checklist.billetsOK : false,
        checklistSanteOK: doc.checklist ? doc.checklist.santeOK : false,
        checklistBagagesOK: doc.checklist ? doc.checklist.bagagesOK : false,
        dateCreation: doc.dateCreation || doc.createdAt || new Date(),
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      }),
      postInsertFn: async (doc) => {
        if (!isDryRun && doc.supplements && doc.supplements.length > 0) {
          // Connecter les suppléments many-to-many
          const packageId = doc._id.toString();
          for (const suppId of doc.supplements) {
            try {
              await prisma.packageK.update({
                where: { id: packageId },
                data: {
                  supplements: {
                    connect: { id: suppId.toString() }
                  }
                }
              });
            } catch (err) {
              console.error(`[Error relation Package-Supplement] Failed to link Supplement ${suppId} to PackageK ${packageId}:`, err.message);
            }
          }
        }
      }
    });

    // --- 6. Produits Boutique ---
    await migrateCollection({
      name: 'Produit',
      mongoModel: Produit,
      prismaModel: prisma.produit,
      mapFn: doc => ({
        id: toStringId(doc._id),
        idProduit: toBigInt(doc.idProduit),
        nom: doc.nom,
        description: doc.description,
        categorie: doc.categorie,
        prix: toDecimal(doc.prix),
        prixPromo: toDecimal(doc.prixPromo),
        stock: doc.stock || 0,
        stockMin: doc.stockMin || 5,
        statut: doc.statut || 'ACTIF',
        marque: doc.marque,
        reference: doc.reference,
        codeBarres: doc.codeBarres,
        dimLongueur: doc.dimensions ? doc.dimensions.longueur : null,
        dimLargeur: doc.dimensions ? doc.dimensions.largeur : null,
        dimHauteur: doc.dimensions ? doc.dimensions.hauteur : null,
        dimUnite: doc.dimensions ? doc.dimensions.unite : 'cm',
        poids: doc.poids,
        images: doc.images ? doc.images : Prisma.JsonNull,
        tags: doc.tags ? doc.tags : Prisma.JsonNull,
        fournisseurNom: doc.fournisseur ? doc.fournisseur.nom : null,
        fournisseurContact: doc.fournisseur ? doc.fournisseur.contact : null,
        fournisseurTelephone: doc.fournisseur ? doc.fournisseur.telephone : null,
        fournisseurEmail: doc.fournisseur ? doc.fournisseur.email : null,
        dateCreation: doc.dateCreation || doc.createdAt || new Date(),
        dateDerniereModification: doc.dateDerniereModification || doc.updatedAt || new Date(),
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        modifieParUtilisateurId: toStringId(doc.modifieParUtilisateurId),
        notes: doc.notes,
        slug: doc.slug,
        metaDescription: doc.metaDescription,
        visible: doc.visible !== undefined ? doc.visible : true,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 7. StockMovements ---
    await migrateCollection({
      name: 'StockMovement',
      mongoModel: StockMovement,
      prismaModel: prisma.stockMovement,
      mapFn: doc => ({
        id: toStringId(doc._id),
        produitId: toStringId(doc.produitId),
        type: doc.type,
        quantite: doc.quantite || 0,
        stockAvant: doc.stockAvant || 0,
        stockApres: doc.stockApres || 0,
        motif: doc.motif || 'AUTRE',
        notes: doc.notes,
        userId: toStringId(doc.userId),
        statut: doc.statut || 'CONFIRME',
        dateEvenement: doc.dateEvenement || doc.createdAt || new Date(),
        referenceExterne: doc.referenceExterne,
        documentSource: doc.documentSource,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 8. ShopOrders ---
    await migrateCollection({
      name: 'ShopOrder',
      mongoModel: ShopOrder,
      prismaModel: prisma.shopOrder,
      mapFn: doc => ({
        id: toStringId(doc._id),
        orderNumber: doc.orderNumber,
        clientId: toStringId(doc.clientId),
        createdBy: toStringId(doc.createdBy),
        montantTotal: doc.montantTotal || 0,
        status: doc.status || 'EN_ATTENTE_PAIEMENT',
        paymentMontant: doc.payment ? doc.payment.montant : null,
        paymentMode: doc.payment ? doc.payment.mode : null,
        paymentReference: doc.payment ? doc.payment.reference : null,
        paymentDateReglement: doc.payment ? doc.payment.dateReglement : null,
        paymentPaiementId: doc.payment ? toStringId(doc.payment.paiementId) : null,
        notes: doc.notes,
        paidAt: doc.paidAt,
        paidBy: toStringId(doc.paidBy),
        cancelledAt: doc.cancellation ? doc.cancellation.cancelledAt : null,
        cancelledBy: doc.cancellation ? toStringId(doc.cancellation.cancelledBy) : null,
        cancelMotif: doc.cancellation ? doc.cancellation.motif : null,
        cancelAction: doc.cancellation ? doc.cancellation.action : null,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      }),
      postInsertFn: async (doc) => {
        if (!isDryRun && doc.items && doc.items.length > 0) {
          // Insérer les items de la commande
          const orderId = doc._id.toString();
          for (const item of doc.items) {
            try {
              await prisma.shopOrderItem.create({
                data: {
                  orderId: orderId,
                  produitId: item.produitId.toString(),
                  nomProduit: item.nomProduit,
                  quantite: item.quantite || 0,
                  prixUnitaire: item.prixUnitaire || 0,
                  sousTotal: item.sousTotal || 0
                }
              });
            } catch (err) {
              console.error(`[Error ShopOrderItem] Failed to create item for order ${orderId}:`, err.message);
            }
          }
        }
      }
    });

    // --- 9. Reservations ---
    await migrateCollection({
      name: 'Reservation',
      mongoModel: Reservation,
      prismaModel: prisma.reservation,
      mapFn: doc => ({
        id: toStringId(doc._id),
        numero: doc.numero,
        idReservation: toBigInt(doc.idReservation),
        nombrePlaces: doc.nombrePlaces || 1,
        typeChambre: doc.typeChambre,
        formule: doc.formule,
        niveauConfort: doc.niveauConfort,
        dateDepart: doc.dateDepart,
        dateRetour: doc.dateRetour,
        montantTotalDu: doc.montantTotalDu || 0,
        statutClient: doc.statutClient || 'INSCRIT',
        statutPaiement: doc.statutPaiement || 'EN_ATTENTE',
        statut: doc.statut || 'INSCRIT',
        statutCreation: doc.statutCreation || doc.createdAt || new Date(),
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        packageKId: toStringId(doc.packageKId),
        notes: doc.notes,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      }),
      postInsertFn: async (doc) => {
        if (!isDryRun && doc.clients && doc.clients.length > 0) {
          // Connecter les clients many-to-many
          const reservationId = doc._id.toString();
          for (const clientId of doc.clients) {
            try {
              await prisma.reservation.update({
                where: { id: reservationId },
                data: {
                  clients: {
                    connect: { id: clientId.toString() }
                  }
                }
              });
            } catch (err) {
              console.error(`[Error relation Reservation-Client] Failed to link Client ${clientId} to Reservation ${reservationId}:`, err.message);
            }
          }
        }
      }
    });

    // --- 10. Billets ---
    await migrateCollection({
      name: 'Billet',
      mongoModel: Billet,
      prismaModel: prisma.billet,
      mapFn: doc => ({
        id: toStringId(doc._id),
        idBillet: toBigInt(doc.idBillet),
        numeroBillet: doc.numeroBillet,
        compagnie: doc.compagnie,
        classe: doc.classe,
        destination: doc.destination,
        typeBillet: doc.typeBillet,
        dateDepart: doc.dateDepart,
        dateArrivee: doc.dateArrivee,
        statut: doc.statut,
        dateCreation: doc.dateCreation || doc.createdAt || new Date(),
        clientId: toStringId(doc.clientId),
        prix: doc.prix || 0,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 11. Paiements ---
    await migrateCollection({
      name: 'Paiement',
      mongoModel: Paiement,
      prismaModel: prisma.paiement,
      mapFn: doc => ({
        id: toStringId(doc._id),
        idPaiement: toBigInt(doc.idPaiement),
        montant: toDecimal(doc.montant),
        dateReglement: doc.dateReglement,
        mode: doc.mode,
        reference: doc.reference,
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        dateCreation: doc.dateCreation || doc.createdAt || new Date(),
        reservationId: toStringId(doc.reservationId),
        billetId: toStringId(doc.billetId),
        shopOrderId: toStringId(doc.shopOrderId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 12. Documents ---
    await migrateCollection({
      name: 'Document',
      mongoModel: Document,
      prismaModel: prisma.document,
      mapFn: doc => ({
        id: toStringId(doc._id),
        idDocument: toBigInt(doc.idDocument),
        clientId: toStringId(doc.clientId),
        reservationId: toStringId(doc.reservationId),
        billetId: toStringId(doc.billetId),
        type: doc.type,
        cheminFichier: doc.cheminFichier,
        publicId: doc.publicId,
        statut: doc.statut || 'EN_ATTENTE',
        dateCreation: doc.dateCreation || doc.createdAt || new Date(),
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 13. Desistements ---
    await migrateCollection({
      name: 'Desistement',
      mongoModel: Desistement,
      prismaModel: prisma.desistement,
      mapFn: doc => ({
        id: toStringId(doc._id),
        reservationId: toStringId(doc.reservationId),
        clientId: toStringId(doc.clientId),
        dateAnnulation: doc.dateAnnulation || doc.createdAt || new Date(),
        dateDepart: doc.dateDepart,
        joursAvantDepart: doc.joursAvantDepart,
        tauxRemboursement: doc.tauxRemboursement,
        montantPaye: doc.montantPaye || 0,
        montantRembourse: doc.montantRembourse,
        motif: doc.motif,
        statut: doc.statut || 'EN_ATTENTE',
        dateRemboursement: doc.dateRemboursement,
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 14. Visas ---
    await migrateCollection({
      name: 'Visa',
      mongoModel: Visa,
      prismaModel: prisma.visa,
      mapFn: doc => ({
        id: toStringId(doc._id),
        reservationId: toStringId(doc.reservationId),
        clientId: toStringId(doc.clientId),
        statut: doc.statut || 'EN_ATTENTE_PASSEPORT',
        dateEnvoi: doc.dateEnvoi,
        dateReception: doc.dateReception,
        motifRefus: doc.motifRefus,
        notes: doc.notes,
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 15. BilanDeparts ---
    await migrateCollection({
      name: 'BilanDepart',
      mongoModel: BilanDepart,
      prismaModel: prisma.bilanDepart,
      mapFn: doc => ({
        id: toStringId(doc._id),
        packageId: toStringId(doc.packageId),
        nomReference: doc.nomReference,
        dateCreation: doc.dateCreation || doc.createdAt || new Date(),
        createdBy: doc.createdBy,
        roleCreateur: doc.roleCreateur,
        commentaires: doc.commentaires,
        observations: doc.observations,
        actionsSuivi: doc.actionsSuivi ? doc.actionsSuivi : Prisma.JsonNull,
        statut: doc.statut || 'ACTIF',
        dateModification: doc.dateModification || doc.updatedAt || new Date(),
        modifiePar: doc.modifiePar,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 16. Bureaux ---
    await migrateCollection({
      name: 'Bureau',
      mongoModel: Bureau,
      prismaModel: prisma.bureau,
      mapFn: doc => ({
        id: toStringId(doc._id),
        idBureau: toBigInt(doc.idBureau),
        nom: doc.nom,
        adresse: doc.adresse,
        telephone: doc.telephone ? doc.telephone : Prisma.JsonNull,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 17. ConfigurationPeriodes ---
    await migrateCollection({
      name: 'ConfigurationPeriode',
      mongoModel: ConfigurationPeriode,
      prismaModel: prisma.configurationPeriode,
      mapFn: doc => ({
        id: toStringId(doc._id),
        idConfigurationPeriode: toBigInt(doc.idConfigurationPeriode),
        type: doc.type,
        mois: doc.mois,
        prixBaseGrille: toDecimal(doc.prixBaseGrille),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 18. Depenses ---
    await migrateCollection({
      name: 'Depense',
      mongoModel: Depense,
      prismaModel: prisma.depense,
      mapFn: doc => ({
        id: toStringId(doc._id),
        categorie: doc.categorie,
        montant: doc.montant || 0,
        description: doc.description,
        dateDepense: doc.dateDepense || doc.createdAt || new Date(),
        justificatif: doc.justificatif,
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 19. HistoriqueActions ---
    await migrateCollection({
      name: 'HistoriqueAction',
      mongoModel: HistoriqueAction,
      prismaModel: prisma.historiqueAction,
      mapFn: doc => ({
        id: toStringId(doc._id),
        idHistoriqueAction: toBigInt(doc.idHistoriqueAction || Date.now()),
        dateAction: doc.dateAction || doc.createdAt || new Date(),
        typeAction: doc.typeAction,
        entiteVisee: doc.entiteVisee,
        detailsModif: doc.detailsModif,
        ParUtilisateurId: toStringId(doc.ParUtilisateurId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 20. Messages ---
    await migrateCollection({
      name: 'Message',
      mongoModel: Message,
      prismaModel: prisma.message,
      mapFn: doc => ({
        id: toStringId(doc._id),
        expediteurId: toStringId(doc.expediteurId),
        destinataireId: toStringId(doc.destinataireId),
        contenu: doc.contenu,
        lu: doc.lu || false,
        luAt: doc.luAt,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 21. Rapports Quotidiens ---
    await migrateCollection({
      name: 'RapportQuotidien',
      mongoModel: RapportQuotidien,
      prismaModel: prisma.rapportQuotidien,
      mapFn: doc => ({
        id: toStringId(doc._id),
        agentId: toStringId(doc.agentId),
        date: doc.date || doc.createdAt || new Date(),
        dateCreation: doc.dateCreation || doc.createdAt || new Date(),
        dateModification: doc.dateModification || doc.updatedAt || new Date(),
        activites: doc.activites,
        problemes: doc.problemes,
        objectifsDemain: doc.objectifsDemain,
        notes: doc.notes,
        statutJournee: doc.statutJournee || 'NORMAL',
        appelsClients: doc.appelsClients || 0,
        inscriptionsCreees: doc.inscriptionsCreees || 0,
        paiementsEncaisses: doc.paiementsEncaisses || 0,
        suiviCommercial: doc.suiviCommercial,
        constats: doc.constats,
        appelsDetail: doc.appelsDetail ? doc.appelsDetail : Prisma.JsonNull,
        plateformes: doc.plateformes ? doc.plateformes : Prisma.JsonNull,
        publications: doc.publications || 0,
        vues: doc.vues || 0,
        abonnesGagnes: doc.abonnesGagnes || 0,
        likes: doc.likes || 0,
        commentaires: doc.commentaires || 0,
        partages: doc.partages || 0,
        campagnesActives: doc.campagnesActives || 0,
        budgetCampagne: doc.budgetCampagne || 0,
        tauxEngagement: doc.tauxEngagement || 0,
        articlesPub: doc.articlesPub || 0,
        packagesMAJ: doc.packagesMAJ || 0,
        bugsCorriges: doc.bugsCorriges || 0,
        etatSite: doc.etatSite,
        problemesRegles: doc.problemesRegles,
        backupEffectue: doc.backupEffectue || false,
        maintenancePreventive: doc.maintenancePreventive,
        alertes: doc.alertes ? doc.alertes : Prisma.JsonNull,
        commentairesDirection: doc.commentairesDirection,
        statutLecture: doc.statutLecture || false,
        dateValidation: doc.dateValidation,
        version: doc.version || 1,
        historiqueMoifications: doc.historiqueMoifications ? doc.historiqueMoifications : Prisma.JsonNull,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 22. Relances ---
    await migrateCollection({
      name: 'Relance',
      mongoModel: Relance,
      prismaModel: prisma.relance,
      mapFn: doc => ({
        id: toStringId(doc._id),
        reservationId: toStringId(doc.reservationId),
        clientId: toStringId(doc.clientId),
        dateRelance: doc.dateRelance || doc.createdAt || new Date(),
        notes: doc.notes,
        resultat: doc.resultat || 'JOINT',
        dateProchaineRelance: doc.dateProchaineRelance,
        agentId: toStringId(doc.agentId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 23. Reunions ---
    await migrateCollection({
      name: 'Reunion',
      mongoModel: Reunion,
      prismaModel: prisma.reunion,
      mapFn: doc => ({
        id: toStringId(doc._id),
        packageKId: toStringId(doc.packageKId),
        titre: doc.titre,
        dateReunion: doc.dateReunion,
        lieu: doc.lieu,
        ordreJour: doc.ordreJour,
        participants: doc.participants ? doc.participants : Prisma.JsonNull,
        statut: doc.statut || 'PLANIFIEE',
        compteRendu: doc.compteRendu,
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 24. ZiarraProspects ---
    await migrateCollection({
      name: 'ZiarraProspect',
      mongoModel: ZiarraProspect,
      prismaModel: prisma.ziarraProspect,
      mapFn: doc => ({
        id: toStringId(doc._id),
        clientId: toStringId(doc.clientId),
        nom: doc.nom,
        prenom: doc.prenom,
        telephone: doc.telephone,
        email: doc.email,
        statut: doc.statut || 'PROSPECT',
        dateContact: doc.dateContact || doc.createdAt || new Date(),
        dateDepart: doc.dateDepart,
        notes: doc.notes,
        agentId: toStringId(doc.agentId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    // --- 25. AuditLogs ---
    await migrateCollection({
      name: 'AuditLog',
      mongoModel: AuditLog,
      prismaModel: prisma.auditLog,
      mapFn: doc => ({
        id: toStringId(doc._id),
        userId: toStringId(doc.userId),
        userNom: doc.userNom,
        action: doc.action,
        module: doc.module,
        details: doc.details ? doc.details : Prisma.JsonNull,
        createdAt: doc.createdAt || doc.dateCreation || new Date()
      })
    });

    // --- 26. BilletGroupes ---
    await migrateCollection({
      name: 'BilletGroupe',
      mongoModel: BilletGroupe,
      prismaModel: prisma.billetGroupe,
      mapFn: doc => ({
        id: toStringId(doc._id),
        packageKId: toStringId(doc.packageKId),
        compagnie: doc.compagnie,
        numeroVol: doc.numeroVol,
        dateDepart: doc.dateDepart,
        dateArrivee: doc.dateArrivee,
        villeDepart: doc.villeDepart,
        villeArrivee: doc.villeArrivee,
        nombreSieges: doc.nombreSieges || 0,
        prixUnitaire: doc.prixUnitaire || 0,
        statut: doc.statut || 'EN_ATTENTE',
        notes: doc.notes,
        creeParUtilisateurId: toStringId(doc.creeParUtilisateurId),
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date()
      })
    });

    console.log(`
================================================================
🎉 PROCESSUS DE MIGRATION TERMINE AVEC SUCCES
================================================================
`);

  } catch (error) {
    console.error('💥 ERREUR FATALE DURANT LA MIGRATION :', error);
  } finally {
    // 3. Clôture des connexions
    await mongoose.disconnect();
    await prisma.$disconnect();
    console.log('🔌 Connexions fermées proprement');
  }
}

/**
 * Fonction générique pour migrer une collection entière
 */
async function migrateCollection({ name, mongoModel, prismaModel, mapFn, postInsertFn }) {
  console.log(`\n📦 Migration de la collection [${name}]...`);
  
  try {
    // Lire toutes les données MongoDB
    const docs = await mongoModel.find().lean();
    console.log(`  └─ Trouvé ${docs.length} documents dans MongoDB`);

    if (docs.length === 0) return;

    let countCreated = 0;
    let countSkipped = 0;
    let countFailed = 0;

    for (const doc of docs) {
      const id = doc._id.toString();
      
      try {
        if (!isDryRun) {
          // Vérifier si la ligne existe déjà dans Postgres
          const exists = await prismaModel.findUnique({
            where: { id }
          });

          if (exists) {
            countSkipped++;
            continue;
          }

          // Mapper et insérer
          const prismaData = mapFn(doc);
          await prismaModel.create({
            data: prismaData
          });

          // Post-traitements (comme les liaisons relationnelles de liaison tables)
          if (postInsertFn) {
            await postInsertFn(doc);
          }
          
          countCreated++;
        } else {
          // Mode simulation (Dry run) : On mappe juste pour vérifier la validité
          mapFn(doc);
          countCreated++;
        }
      } catch (err) {
        countFailed++;
        console.error(`  ⚠️ [Erreur] ID ${id} dans la table [${name}] :`, err.message);
      }
    }

    console.log(`  └─ Bilan [${name}] : ${countCreated} insérés/validés, ${countSkipped} ignorés (déjà existants), ${countFailed} échecs`);
  } catch (err) {
    console.error(`  ❌ Impossible de migrer la collection [${name}] :`, err.message);
  }
}

// Lancer la migration
run();
