/**
 * @fileoverview Seed script PostgreSQL pour Kyswa Travel
 * Remplit la base PostgreSQL avec des données de démonstration réalistes
 */
require('dotenv').config();
const prisma = require('../src/database/client');

async function main() {
  console.log('🌱 Démarrage du Seed PostgreSQL...');

  // 1. Récupérer un utilisateur agent/dg
  const profile = await prisma.profiles.findFirst();
  if (!profile) {
    console.error('❌ Aucun profil trouvé.');
    process.exit(1);
  }

  // 2. Récupérer un départ
  let depart = await prisma.departs.findFirst({ where: { actif: true } });
  if (!depart) {
    depart = await prisma.departs.create({
      data: {
        service: 'Oumra',
        nom_depart: 'Oumra Ramadan 2026 - Groupe Confort',
        date_depart: new Date('2026-03-15T00:00:00Z'),
        date_retour: new Date('2026-03-30T00:00:00Z'),
        places_total: 45,
        places_restantes: 30,
        actif: true,
      }
    });
  }

  // 3. Création des Clients
  console.log('👥 Création des clients de démonstration...');
  const clientsData = [
    {
      nom: 'Sow', prenom: 'Amadou', genre: 'M', telephone: '+221 77 123 45 67',
      email: 'amadou.sow@gmail.com', adresse: 'Sacré Cœur 3', ville: 'Dakar',
      n_passeport: 'A01234567', nationalite: 'Sénégalaise', vip: true,
      profession: 'Ingénieur', created_by: profile.id
    },
    {
      nom: 'Ndiaye', prenom: 'Fatou Binetou', genre: 'F', telephone: '+221 78 987 65 43',
      email: 'fatou.ndiaye@yahoo.fr', adresse: 'Mermoz Pyrotechnie', ville: 'Dakar',
      n_passeport: 'A09876543', nationalite: 'Sénégalaise', vip: false,
      profession: 'Commerçante', created_by: profile.id
    },
    {
      nom: 'Diop', prenom: 'Cheikh Tidiane', genre: 'M', telephone: '+221 76 555 44 33',
      email: 'cheikh.diop@outlook.com', adresse: 'Point E', ville: 'Dakar',
      n_passeport: 'A05554433', nationalite: 'Sénégalaise', vip: true,
      profession: 'Médecin', created_by: profile.id
    },
    {
      nom: 'Fall', prenom: 'Awa', genre: 'F', telephone: '+221 77 444 33 22',
      email: 'awa.fall@gmail.com', adresse: 'Fann Résidence', ville: 'Dakar',
      n_passeport: 'A04443322', nationalite: 'Sénégalaise', vip: false,
      profession: 'Enseignante', created_by: profile.id
    },
    {
      nom: 'Gueye', prenom: 'Moustapha', genre: 'M', telephone: '+221 70 888 99 00',
      email: 'tapha.gueye@gmail.com', adresse: 'Les Almadies', ville: 'Dakar',
      n_passeport: 'A08889900', nationalite: 'Sénégalaise', vip: true,
      profession: 'Directeur de Société', created_by: profile.id
    }
  ];

  const createdClients = [];
  for (const cData of clientsData) {
    let existing = await prisma.clients.findFirst({ where: { email: cData.email } });
    if (!existing) {
      existing = await prisma.clients.create({ data: cData });
    }
    createdClients.push(existing);
  }
  console.log(`✅ ${createdClients.length} clients prêts.`);

  // 4. Création des Inscriptions / Réservations & Paiements
  console.log('📝 Création des inscriptions et paiements...');
  const createdInscriptions = [];
  let numSeq = 501;

  for (let i = 0; i < createdClients.length; i++) {
    const client = createdClients[i];
    let existingIns = await prisma.inscriptions.findFirst({ where: { client_id: client.id } });

    if (!existingIns) {
      const prixTotal = 2500000 + (i * 200000);
      const acompte = 1000000 + (i * 100000);
      const isSolde = i % 2 === 0;

      existingIns = await prisma.inscriptions.create({
        data: {
          numero: `INS-2026-${numSeq++}`,
          client_id: client.id,
          depart_id: depart.id,
          service: 'Oumra',
          formule: i % 2 === 0 ? 'Confort' : 'VIP',
          type_chambre: i % 2 === 0 ? 'Double' : 'Single',
          hotel_makkah: 'Pullman Zamzam Makkah',
          hotel_medine: 'Dar Al Taqwa Medina',
          prix_total: prixTotal,
          acompte: acompte,
          statut_paiement: isSolde ? 'Soldé' : 'Partiel',
          statut_client: 'Inscrit',
          agent_id: profile.id,
        }
      });

      // Paiement associé
      await prisma.paiements.create({
        data: {
          inscriptions: { connect: { id: existingIns.id } },
          profiles: { connect: { id: profile.id } },
          montant: BigInt(isSolde ? prixTotal : acompte),
          mode_paiement: i % 2 === 0 ? 'Virement' : 'Espèces',
          recu_numero: `REC-2026-${100 + i}`,
          date_paiement: new Date(),
          notes: 'Acompte initial de réservation'
        }
      });
    }
    createdInscriptions.push(existingIns);
  }
  console.log(`✅ ${createdInscriptions.length} inscriptions et paiements créés.`);

  // 5. Création des produits Kyswa Shop
  console.log('🛍️ Création des produits Shop...');
  const shopProduits = [
    {
      nom: 'Tapis de Prière Rembourré Orthopédique',
      reference: 'PROD-TAPIS-01',
      categorie: 'ACCESSOIRES',
      prix: 25000,
      stock: 50,
      description: 'Tapis haute densité idéal pour les longues prières.'
    },
    {
      nom: 'Chapelet Électronique Numérique Premium',
      reference: 'PROD-CHAP-01',
      categorie: 'ELECTRONIQUE',
      prix: 5000,
      stock: 100,
      description: 'Compteur de Zikr LED rechargeable USB.'
    },
    {
      nom: 'Tenue d Ihram Homme Coton Égyptien 100%',
      reference: 'PROD-IHRAM-01',
      categorie: 'VETEMENTS',
      prix: 35000,
      stock: 30,
      description: '2 pièces d ihram absorbantes et légères.'
    },
    {
      nom: 'Bidon d Eau de Zamzam Purifiée 5L',
      reference: 'PROD-ZAMZAM-5L',
      categorie: 'EAU_ZAMZAM',
      prix: 15000,
      stock: 40,
      description: 'Eau bénite de Zamzam scellée d origine.'
    },
    {
      nom: 'Coffret Parfum Musk d Arabie Kyswa',
      reference: 'PROD-MUSK-01',
      categorie: 'PARFUMERIE',
      prix: 18000,
      stock: 60,
      description: 'Assortiment de 4 huiles parfumées sans alcool.'
    }
  ];

  for (const p of shopProduits) {
    const existingP = await prisma.shop_produits.findFirst({ where: { reference: p.reference } });
    if (!existingP) {
      await prisma.shop_produits.create({ data: p });
    }
  }
  console.log('✅ Produits du Shop créés.');

  console.log('🎉 Seed PostgreSQL terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
