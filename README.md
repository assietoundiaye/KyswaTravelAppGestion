# Kyswa Travel — Plateforme de Gestion Interne

Application web de gestion interne pour une agence de voyages religieux (Oumra, Hajj, Ziarra Fès). Développée avec la stack MERN (MongoDB, Express, React, Node.js).

---

## Prérequis

- Node.js ≥ 18
- npm ou pnpm
- Compte MongoDB Atlas (ou MongoDB local)
- Compte Cloudinary (pour l'upload de documents)

---

## Installation

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

Créer le fichier `.env` :

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/kyswa
JWT_SECRET=votre_secret_jwt_tres_long
JWT_REFRESH_SECRET=votre_secret_refresh_different
PORT=3000
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

Démarrer le serveur :

```bash
node index.js
# ou avec nodemon
npx nodemon index.js
```

Lancer les tests :

```bash
npm test
```

Accéder à la documentation API :

```
http://localhost:3000/api-docs
```

### 3. Frontend

```bash
cd clientKyswa
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

### 4. Créer le premier compte administrateur

```bash
node serverKyswa/scripts/createAdmin.js
```

Identifiants par défaut : `admin@kyswa.sn` / `Admin123!`

---

## Structure du projet

```
kyswa-app/
├── serverKyswa/          # API Node.js/Express
│   ├── config/           # Cloudinary, Swagger
│   ├── middleware/       # auth.js, errorHandler.js
│   ├── models/           # Schémas Mongoose
│   ├── routes/           # Routes REST
│   ├── services/         # Logique métier (NEW v2.1.0)
│   ├── scripts/          # createAdmin.js
│   ├── utils/            # jwt.js
│   ├── __tests__/        # Tests unitaires (NEW v2.1.0)
│   └── index.js
│
└── clientKyswa/          # SPA React/Vite
    └── src/
        ├── api/           # axios.js (intercepteurs JWT)
        ├── components/    # Composants réutilisables
        ├── context/       # AuthContext
        ├── hooks/         # useSocket.js
        ├── pages/         # Pages par module
        └── utils/         # roles.js
```

---

## Rôles utilisateurs

| Rôle | Description |
|---|---|
| `dg` | Directeur Général — accès complet |
| `administrateur` | Gestion système, utilisateurs, audit |
| `comptable` | Finances, paiements, comptabilité |
| `oumra` | Responsable Oumra — inscriptions, visas, billets |
| `commercial` | Clients, inscriptions, recouvrement |
| `secretaire` | Coordination, documents, réunions |
| `billets` | Billets individuels et groupe |
| `ziara` | Prospects Ziarra Fès |
| `social` | Messagerie, rapports |

---

## Modules fonctionnels

| Module | Description |
|---|---|
| Clients CRM | Fiches clients avec historique voyages |
| Inscriptions | Gestion des pèlerins par départ |
| Paiements | Versements avec calcul automatique du reste |
| Packages | Offres de voyage avec prix par chambre |
| Visas | Suivi des dossiers visa |
| Billets | Individuels et groupe |
| Désistements | Annulations avec calcul remboursement |
| Recouvrement | Impayés urgents + relances |
| Réunions | Pré-départ avec checklist |
| Comptabilité | Dépenses + solde mensuel |
| Bilan Départs | Synthèse financière par départ |
| Messagerie | Temps réel via Socket.IO |
| Rapports | Journaliers par agent |
| Secrétariat | Documents, urgences, supervision |
| Utilisateurs | Gestion des comptes |
| Audit | Journal de traçabilité |
| Simulateur | Calcul estimatif de prix |
| Ziarra | Prospects voyages Fès |

---

## API — Endpoints principaux

```
POST   /api/auth/login              Connexion
POST   /api/auth/refresh            Renouvellement token

GET    /api/clients                 Liste clients
POST   /api/clients                 Créer client

GET    /api/reservations            Liste inscriptions
POST   /api/reservations            Créer inscription
PATCH  /api/reservations/:id/statut-client  Changer statut

POST   /api/reservations/:id/paiements  Enregistrer paiement
DELETE /api/paiements/:id           Supprimer paiement (comptable)

GET    /api/packages                Liste départs
POST   /api/packages                Créer départ (dg/admin)

GET    /api/stats                   Statistiques globales
GET    /api/export/clients          Export CSV clients
GET    /api/factures/reservation/:id  Facture PDF

GET    /api/public/reservation      Suivi public inscription
GET    /api/public/billet           Suivi public billet
```

---

## Variables d'environnement

| Variable | Description | Requis |
|---|---|---|
| `MONGO_URI` | URI MongoDB Atlas | Oui |
| `JWT_SECRET` | Clé secrète access token | Oui |
| `JWT_REFRESH_SECRET` | Clé secrète refresh token | Non (fallback JWT_SECRET) |
| `PORT` | Port du serveur (défaut: 3000) | Non |
| `CLOUDINARY_CLOUD_NAME` | Nom du cloud Cloudinary | Pour uploads |
| `CLOUDINARY_API_KEY` | Clé API Cloudinary | Pour uploads |
| `CLOUDINARY_API_SECRET` | Secret API Cloudinary | Pour uploads |
| `KYSWA_LOGO_BASE64` | Logo en base64 pour les PDF | Non |

---

## Technologies utilisées

**Backend**
- Node.js 18+ / Express 4
- MongoDB Atlas / Mongoose 8
- Socket.IO 4
- JWT (jsonwebtoken) + bcryptjs
- Multer + Cloudinary
- jsPDF + jspdf-autotable
- express-validator / express-rate-limit
- **Jest + Supertest** (tests) ✨ NEW v2.1.0
- **Swagger/OpenAPI** (documentation) ✨ NEW v2.1.0

**Frontend**
- React 18 / Vite 5
- React Router v6
- Axios (avec intercepteurs JWT)
- Socket.IO Client
- Lucide React (icônes)
- Tailwind CSS + CSS Variables

---

## Tests et Qualité

### Lancer les tests

```bash
cd serverKyswa
npm test
```

### Couverture des tests

```bash
npm test -- --coverage
```

### Tests disponibles

- **authService** - 18 tests (authentification, register, login, refresh)
- **paiementService** - 13 tests (paiements réservations et billets)
- **reservationService** - 10 tests (CRUD réservations)

**Total : 41 tests automatisés** ✅

---

## Documentation API

### Accéder à Swagger

1. Démarrer le serveur : `npm start`
2. Ouvrir : http://localhost:3000/api-docs
3. Tester les endpoints directement dans l'interface

### Endpoints documentés

- ✅ Authentification (register, login, refresh)
- 🔄 Réservations (en cours)
- 🔄 Paiements (en cours)
- 🔄 Clients (en cours)

---

## Documentation complète

📚 **[INDEX DE LA DOCUMENTATION](docs/INDEX.md)** - Point d'entrée vers toute la documentation

### Documents essentiels
- ⭐ [Résumé architecture](docs/RESUME-ARCHITECTURE.md) - Vue d'ensemble synthétique
- ⭐ [Architecture logique améliorée](docs/architecture-logique-amelioree.md) - Documentation complète
- ⭐ [Architecture technique améliorée](docs/architecture-technique-amelioree.md) - Stack technique détaillée
- 🔧 [Guide de migration](docs/GUIDE-MIGRATION-ARCHITECTURE.md) - Migration vers architecture modulaire
- ✨ **[Priorité 1 - Implémentation](docs/PRIORITE-1-IMPLEMENTATION.md)** - Services, tests, Swagger ✅ NEW

### Diagrammes UML
- [Architecture logique (PlantUML)](docs/uml/architecture-logique-amelioree.puml)
- [Architecture technique (PlantUML)](docs/uml/architecture-technique-amelioree.puml)
- [Flux de données détaillé (PlantUML)](docs/uml/flux-donnees-detaille.puml)
- [Structure modulaire (PlantUML)](docs/uml/structure-modules.puml)
- [Cas d'utilisation](docs/uml/cas-utilisation.puml)
- [Diagrammes de classes](docs/uml/)

### Autres documents
- [Fonctionnalités détaillées](docs/fonctionnalites.md)
- [Choix technologiques](docs/choix-technologiques.md)

---

## Licence

Usage interne — Kyswa Travel © 2026
