/**
 * @fileoverview Table de correspondance MongoDB → Supabase
 * 
 * Ce fichier centralise l'accès aux délégués Prisma réels
 * pour tous les modules du backend Kyswa.
 * 
 * Importez ce fichier dans vos repositories pour obtenir
 * le bon délégué Prisma correspondant à votre module.
 * 
 * USAGE :
 *   const { clients, inscriptions, paiements } = require('./prismaModels');
 * 
 * =========================================================================
 * CORRESPONDANCE COMPLÈTE MongoDB ↔ Supabase
 * =========================================================================
 * 
 *  ANCIEN NOM MONGOOSE     │ VRAIE TABLE SUPABASE    │ DÉLÉGUÉ PRISMA
 *  ─────────────────────────┼─────────────────────────┼──────────────────
 *  Client                   │ clients                  │ prisma.clients
 *  Utilisateur              │ profiles                 │ prisma.profiles
 *  Reservation              │ inscriptions             │ prisma.inscriptions
 *  PackageK (voyage Kyswa)  │ departs                  │ prisma.departs
 *  Paiement                 │ paiements                │ prisma.paiements
 *  Billet (pèlerins)        │ billets_pelerins         │ prisma.billets_pelerins
 *  Billet (compagnie)       │ billets                  │ prisma.billets
 *  Desistement              │ desistements             │ prisma.desistements
 *  Visa                     │ visas                    │ prisma.visas
 *  Depense                  │ depenses                 │ prisma.depenses
 *  ZiarraProspect           │ prospects_ziarra         │ prisma.prospects_ziarra
 *  RapportQuotidien         │ rapports_quotidiens      │ prisma.rapports_quotidiens
 *  Reunion                  │ reunions                 │ prisma.reunions
 *  Message                  │ messages                 │ prisma.messages
 *  Document                 │ documents_admin          │ prisma.documents_admin
 *  Supplement               │ N/A (inclus dans departs)│ —
 *  PackageK (concurrents)   │ packages                 │ prisma.packages (scraping)
 *  BilletGroupe             │ billets_groupe           │ prisma.billets_groupe
 *  BilanDepart              │ bilan_departs            │ prisma.bilan_departs
 *  AuditLog                 │ audit_logs               │ prisma.audit_logs
 *  Relance                  │ recouvrement             │ prisma.recouvrement
 *  Bureau                   │ (non migré)              │ —
 *  HistoriqueAction         │ (non migré)              │ —
 *  Counter                  │ (non migré)              │ —
 * =========================================================================
 */

const prisma = require('./client');

module.exports = {
  // Clients et utilisateurs
  clients:           prisma.clients,
  profiles:          prisma.profiles,

  // Opérationnel voyages
  inscriptions:      prisma.inscriptions,
  departs:           prisma.departs,
  paiements:         prisma.paiements,
  desistements:      prisma.desistements,
  visas:             prisma.visas,

  // Billetterie
  billets_pelerins:  prisma.billets_pelerins,
  billets:           prisma.billets,
  billets_groupe:    prisma.billets_groupe,
  compagnies:        prisma.compagnies,

  // Finance
  depenses:          prisma.depenses,
  recouvrement:      prisma.recouvrement,

  // Rapports & suivi
  rapports_quotidiens: prisma.rapports_quotidiens,
  bilan_departs:     prisma.bilan_departs,
  reunions:          prisma.reunions,
  reunions_dg:       prisma.reunions_dg,
  taches:            prisma.taches,

  // Communication
  messages:          prisma.messages,
  canaux:            prisma.canaux,
  message_reads:     prisma.message_reads,

  // Documents
  documents_admin:   prisma.documents_admin,
  passeports:        prisma.passeports,

  // Prospects
  prospects_ziarra:  prisma.prospects_ziarra,

  // Boutique / Ventes annexes
  ventes_assurances: prisma.ventes_assurances,
  ventes_billets:    prisma.ventes_billets,
  ventes_immobilier: prisma.ventes_immobilier,
  ventes_voitures:   prisma.ventes_voitures,
  fournisseurs:      prisma.fournisseurs,

  // Packages concurrents (scraping)
  packages:          prisma.packages,

  // Audit
  audit_logs:        prisma.audit_logs,

  // Misc
  programmes:        prisma.programmes,
  pelerins:          prisma.pelerins,
  exchange_rates:    prisma.exchange_rates,
};
