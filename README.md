<div align="center">

# ✈️ Kyswa Travel — Plateforme de Gestion Interne

**Application web complète de gestion pour une agence de voyages religieux**  
Oumra · Hajj · Ziarra Fès

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.prisma.io)
[![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)
[![Jest](https://img.shields.io/badge/Tests-41%20tests-C21325?style=flat-square&logo=jest&logoColor=white)](https://jestjs.io)
[![License](https://img.shields.io/badge/Licence-Usage%20interne-blue?style=flat-square)](./LICENSE)

</div>

---

## 📋 Table des matières

- [À propos](#-à-propos)
- [Fonctionnalités](#-fonctionnalités)
- [Stack technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Variables d'environnement](#-variables-denvironnement)
- [Structure du projet](#-structure-du-projet)
- [Rôles utilisateurs](#-rôles-utilisateurs)
- [Modules fonctionnels](#-modules-fonctionnels)
- [API](#-api--endpoints-principaux)
- [Tests](#-tests)
- [Documentation API (Swagger)](#-documentation-api-swagger)
- [Déploiement](#-déploiement)

---

## 🎯 À propos

**Kyswa Travel** est une plateforme de gestion interne développée pour les équipes d'une agence de voyages spécialisée dans le pèlerinage (Oumra, Hajj) et les voyages culturels (Ziarra Fès).

Elle centralise l'ensemble du workflow opérationnel : gestion des clients, inscriptions, paiements, visas, billets d'avion, documents, messagerie interne et rapports — avec un système de **rôles et permissions** granulaire adapté aux différents profils métier.

L'application a été migrée de MongoDB vers **PostgreSQL** (via Prisma ORM) pour une meilleure robustesse et intégrité des données.

---

## ✨ Fonctionnalités

- 👥 **CRM Clients** — Fiches clients complètes avec historique de voyages
- 📋 **Inscriptions** — Gestion des pèlerins par départ/package
- 💰 **Paiements** — Versements avec calcul automatique du reste à payer
- ✈️ **Billets** — Billetterie individuelle et de groupe
- 🛂 **Visas** — Suivi des dossiers visa
- 📦 **Packages/Départs** — Offres de voyage avec tarification par chambre
- 🏪 **Boutique** — Module de vente d'articles (Kyswa Shop)
- 📄 **Documents & Factures** — Génération PDF, upload Cloudinary
- 🔍 **OCR intégré** — Lecture automatique de passeports (Tesseract.js + Mindee)
- 💬 **Messagerie temps réel** — Chat interne via Socket.IO
- 📊 **Rapports** — Rapports journaliers par agent
- 📉 **Désistements** — Annulations avec calcul de remboursement
- 💼 **Recouvrement** — Suivi des impayés urgents
- 🧾 **Comptabilité** — Dépenses et solde mensuel
- 📈 **Bilan Départs** — Synthèse financière par départ
- 🗓️ **Réunions** — Réunions pré-départ avec checklist
- 🔐 **Audit** — Journal de traçabilité complet
- 🕌 **Ziarra** — Gestion des prospects voyages Fès
- ⚙️ **Administration** — Gestion des utilisateurs, permissions, rôles

---

## 🛠️ Stack technique

### Backend

| Technologie | Version | Rôle |
|---|---|---|
| Node.js | 18+ | Runtime JavaScript |
| Express | 5 | Framework HTTP |
| PostgreSQL | — | Base de données relationnelle |
| Prisma | 6 | ORM + migrations |
| Redis | — | Cache sessions (optionnel en dev) |
| Socket.IO | 4 | Messagerie temps réel |
| JWT | — | Authentification (access + refresh tokens) |
| bcryptjs | — | Hachage des mots de passe |
| Multer + Cloudinary | — | Upload de fichiers/photos |
| jsPDF + autotable | — | Génération de PDF |
| Tesseract.js | 7 | OCR passeports (local) |
| Mindee | 5 | OCR passeports (cloud) |
| Helmet | — | Sécurité HTTP headers |
| express-rate-limit | — | Protection contre les abus |
| Swagger / OpenAPI | — | Documentation API interactive |
| Jest + Supertest | — | Tests unitaires et d'intégration |

### Frontend

| Technologie | Version | Rôle |
|---|---|---|
| React | 19 | Framework UI |
| Vite | 7 | Bundler/Dev server |
| React Router | v6 | Navigation SPA |
| Tailwind CSS | 3 | Styles utilitaires |
| Axios | — | Client HTTP (intercepteurs JWT) |
| Socket.IO Client | 4 | Messagerie temps réel |
| TanStack Table | v8 | Tableaux avancés |
| Recharts | 3 | Graphiques et visualisations |
| React Hook Form + Zod | — | Formulaires et validation |
| Lucide React | — | Icônes |
| jsPDF + autotable | — | Génération PDF côté client |

---

## 📦 Prérequis

- **Node.js** ≥ 18 et **npm** (ou pnpm)
- **PostgreSQL** ≥ 14 (local ou Supabase/cloud)
- **Redis** (optionnel en développement, mettre `DISABLE_REDIS=true`)
- **Compte Cloudinary** (pour l'upload de documents et photos)
- **Compte Mindee** (optionnel, pour l'OCR cloud des passeports)

---

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone https://github.com/KYSWAPP/kyswa-app.git
cd kyswa-app
```

### 2. Backend

```bash
cd serverKyswa
npm install
```

Copier et remplir le fichier d'environnement :

```bash
cp .env.example .env
# Éditer .env avec vos vraies valeurs
```

Appliquer les migrations Prisma et générer le client :

```bash
npx prisma migrate deploy
npx prisma generate
```

Alimenter la base de données avec les données initiales (optionnel) :

```bash
npm run seed
```

Créer le premier compte administrateur :

```bash
node scripts/createAdmin.js
```

> 🔑 Identifiants par défaut : `admin@kyswa.sn` / `Admin123!`

Démarrer le serveur :

```bash
# Développement (avec hot reload)
npm run dev

# Production
npm start
```

Le serveur est accessible sur `http://localhost:3000`.  
La documentation Swagger est disponible sur `http://localhost:3000/api-docs`.

### 3. Frontend

```bash
cd clientKyswa
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

---

## 🔐 Variables d'environnement

Copier `serverKyswa/.env.example` en `serverKyswa/.env` et renseigner les valeurs suivantes :

| Variable | Description | Requis |
|---|---|---|
| `PORT` | Port du serveur (défaut : `3000`) | Non |
| `NODE_ENV` | `development` ou `production` | Non |
| `DATABASE_URL` | URL PostgreSQL | ✅ Oui |
| `JWT_SECRET` | Clé secrète access token (≥ 64 caractères) | ✅ Oui |
| `JWT_REFRESH_SECRET` | Clé secrète refresh token (différente) | ✅ Oui |
| `JWT_EXPIRES_IN` | Durée access token (ex: `2h`) | Non |
| `REFRESH_TOKEN_EXPIRES_IN` | Durée refresh token (ex: `7d`) | Non |
| `DISABLE_REDIS` | Désactiver Redis en dev (`true`) | Non |
| `REDIS_HOST` | Hôte Redis | Pour Redis |
| `REDIS_PORT` | Port Redis | Pour Redis |
| `CLOUDINARY_CLOUD_NAME` | Nom du cloud Cloudinary | Pour uploads |
| `CLOUDINARY_API_KEY` | Clé API Cloudinary | Pour uploads |
| `CLOUDINARY_API_SECRET` | Secret API Cloudinary | Pour uploads |
| `MINDEE_API_KEY` | Clé API Mindee (OCR cloud) | Pour OCR |
| `SMTP_HOST` | Hôte SMTP | Pour emails |
| `SMTP_USER` | Utilisateur SMTP | Pour emails |
| `SMTP_PASS` | Mot de passe SMTP | Pour emails |

> 💡 Pour générer un secret JWT solide :
> ```bash
> node -e "require('crypto').randomBytes(64).toString('hex')"
> ```

---

## 📁 Structure du projet

```
kyswa-app/
├── serverKyswa/                  # API Node.js / Express
│   ├── src/
│   │   ├── app.js                # Configuration Express
│   │   ├── index.js              # Point d'entrée serveur
│   │   ├── core/                 # Middlewares, utilitaires partagés
│   │   ├── database/             # Connexion Prisma
│   │   ├── modules/              # Architecture modulaire (1 dossier = 1 domaine)
│   │   │   ├── auth/             # Authentification
│   │   │   ├── clients/          # CRM clients
│   │   │   ├── reservations/     # Inscriptions / pèlerins
│   │   │   ├── paiements/        # Paiements
│   │   │   ├── packages/         # Départs / offres
│   │   │   ├── billets/          # Billets individuels et groupe
│   │   │   ├── visas/            # Suivi des visas
│   │   │   ├── desistements/     # Annulations
│   │   │   ├── recouvrement/     # Impayés
│   │   │   ├── comptabilite/     # Dépenses et solde
│   │   │   ├── bilan/            # Bilan par départ
│   │   │   ├── reunions/         # Réunions pré-départ
│   │   │   ├── messages/         # Messagerie (Socket.IO)
│   │   │   ├── rapports/         # Rapports journaliers
│   │   │   ├── documents/        # Documents & upload
│   │   │   ├── factures/         # Génération PDF
│   │   │   ├── shop/             # Boutique (Kyswa Shop)
│   │   │   ├── supplements/      # Suppléments chambre
│   │   │   ├── users/            # Gestion utilisateurs
│   │   │   ├── permissions/      # Gestion des droits
│   │   │   ├── audit/            # Journal de traçabilité
│   │   │   ├── ziarra/           # Prospects Ziarra Fès
│   │   │   └── public/           # Suivi public (sans auth)
│   │   ├── services/             # Services transversaux
│   │   └── shared/               # Code partagé entre modules
│   ├── prisma/
│   │   └── schema.prisma         # Schéma base de données
│   ├── scripts/                  # Scripts utilitaires
│   ├── __tests__/                # Tests unitaires (Jest)
│   ├── .env.example
│   └── package.json
│
└── clientKyswa/                  # SPA React / Vite
    └── src/
        ├── App.jsx               # Router principal
        ├── components/           # Composants réutilisables
        ├── context/              # AuthContext
        ├── hooks/                # Hooks personnalisés
        ├── layout/               # Layout (sidebar, header)
        ├── modules/              # Pages par domaine métier
        ├── services/             # Appels API
        └── utils/                # roles.js, helpers
```

---

## 👥 Rôles utilisateurs

| Rôle | Description |
|---|---|
| `dg` | Directeur Général — accès complet à tous les modules |
| `administrateur` | Gestion système, utilisateurs, audit, permissions |
| `comptable` | Finances, paiements, comptabilité, bilan |
| `oumra` | Responsable Oumra — inscriptions, visas, billets |
| `commercial` | Clients, inscriptions, recouvrement, packages |
| `secretaire` | Coordination, documents, réunions, supervision |
| `billets` | Billets individuels et de groupe |
| `ziara` | Prospects et gestion Ziarra Fès |
| `social` | Messagerie interne, rapports journaliers |

> 🔒 Chaque route API et chaque page frontend est protégée selon le rôle de l'utilisateur connecté.

---

## 🧩 Modules fonctionnels

| Module | Description |
|---|---|
| 👤 **CRM Clients** | Fiches clients avec historique complet des voyages |
| 📋 **Inscriptions** | Gestion des pèlerins par départ, avec statuts et suivi |
| 💰 **Paiements** | Versements multiples, calcul automatique du reste dû |
| 📦 **Packages** | Offres de voyage avec tarification par type de chambre |
| 🛂 **Visas** | Suivi des dossiers visa (dépôt, obtention, refus) |
| ✈️ **Billets** | Billetterie individuelle et de groupe |
| ❌ **Désistements** | Annulations avec calcul automatique de remboursement |
| 💼 **Recouvrement** | Tableau de bord des impayés urgents |
| 🗓️ **Réunions** | Réunions pré-départ avec checklist de suivi |
| 🧾 **Comptabilité** | Dépenses et solde mensuel |
| 📈 **Bilan Départs** | Synthèse financière complète par départ |
| 💬 **Messagerie** | Chat temps réel via Socket.IO |
| 📊 **Rapports** | Rapports journaliers par agent |
| 📁 **Secrétariat** | Documents, urgences, coordination |
| 📄 **Factures** | Génération et téléchargement de factures PDF |
| 🏪 **Kyswa Shop** | Module boutique — vente d'articles |
| ➕ **Suppléments** | Gestion des suppléments par chambre/pèlerin |
| ⚙️ **Utilisateurs** | Création et gestion des comptes internes |
| 🔐 **Audit** | Journal de traçabilité de toutes les actions |
| 🔮 **Simulateur** | Calculateur estimatif de prix voyage |
| 🕌 **Ziarra** | Gestion des prospects pour les voyages à Fès |

---

## 🌐 API — Endpoints principaux

```
# Authentification
POST   /api/auth/login                          Connexion utilisateur
POST   /api/auth/refresh                        Renouvellement du token JWT

# Clients
GET    /api/clients                             Liste des clients
POST   /api/clients                             Créer un client
GET    /api/clients/:id                         Détail d'un client
PUT    /api/clients/:id                         Modifier un client
DELETE /api/clients/:id                         Supprimer un client

# Inscriptions / Réservations
GET    /api/reservations                        Liste des inscriptions
POST   /api/reservations                        Créer une inscription
PATCH  /api/reservations/:id/statut-client      Changer le statut d'un pèlerin

# Paiements
POST   /api/reservations/:id/paiements          Enregistrer un paiement
DELETE /api/paiements/:id                       Supprimer un paiement (comptable)

# Packages / Départs
GET    /api/packages                            Liste des départs
POST   /api/packages                            Créer un départ (dg / administrateur)

# Statistiques & Exports
GET    /api/stats                               Statistiques globales
GET    /api/export/clients                      Export CSV des clients
GET    /api/factures/reservation/:id            Télécharger une facture PDF

# Suivi public (sans authentification)
GET    /api/public/reservation                  Suivi d'une inscription
GET    /api/public/billet                       Suivi d'un billet
```

> 📚 Tous les endpoints sont documentés de façon interactive sur **[/api-docs](http://localhost:3000/api-docs)** (Swagger UI).

---

## 🧪 Tests

### Lancer les tests

```bash
cd serverKyswa
npm test
```

### Avec couverture de code

```bash
npm test -- --coverage
```

### Suites de tests

| Suite | Nb. tests | Description |
|---|---|---|
| `authService.test.js` | 18 | Authentification, register, login, refresh token |
| `paiementService.test.js` | 13 | Paiements sur réservations et billets |
| `reservationService.test.js` | 10 | CRUD complet des réservations |

**Total : 41 tests automatisés ✅**

---

## 📖 Documentation API (Swagger)

1. Démarrer le serveur : `npm run dev`
2. Ouvrir : [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
3. Tester les endpoints directement depuis l'interface

---

## 🚢 Déploiement

Le projet est conteneurisé avec **Docker**.

```bash
docker-compose up --build
```

Pour un déploiement en production, consulter :

- [`deployment-infomaniak.md`](./deployment-infomaniak.md) — Guide déploiement Infomaniak
- [`deployment-sovereign.md`](./deployment-sovereign.md) — Guide VPS souverain
- [`pre-deployment-checklist.md`](./pre-deployment-checklist.md) — Checklist avant mise en prod

### Scripts Prisma utiles

```bash
npm run prisma:generate   # Générer le client Prisma
npm run prisma:migrate    # Appliquer les migrations (développement)
npm run prisma:deploy     # Appliquer les migrations (production)
npx prisma studio         # Inspecter la base de données
```

---

## 📚 Documentation

| Document | Description |
|---|---|
| [`CHANGELOG.md`](./CHANGELOG.md) | Historique des versions et changements |
| [`docs/`](./docs/) | Architecture, diagrammes UML, choix technologiques |
| [`COMMENCEZ_ICI.md`](./COMMENCEZ_ICI.md) | Guide de démarrage rapide |

---

## 📝 Licence

Usage interne — **Kyswa Travel © 2026**  
Tous droits réservés. Ce logiciel est propriétaire et réservé à l'usage exclusif de l'équipe Kyswa Travel.
