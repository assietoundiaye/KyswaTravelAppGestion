# Kyswa Travel — Plateforme de Gestion Omra & Hajj

Système de gestion interne (ERP) pour agence de voyage spécialisée au Sénégal.  
Gestion des réservations, billets, clients, paiements, documents et suivi public.

---

## Stack technique

- **Backend** : Node.js, Express 5, MongoDB/Mongoose, JWT, Cloudinary, jsPDF
- **Frontend** : React 19, Vite, Tailwind CSS, Axios, React Hook Form, Zod

---

## Structure du projet

```
KyswaTravelAppGestion/
├── serverKyswa/           # Backend Express
│   ├── config/            # Cloudinary config
│   ├── middleware/        # auth.js, errorHandler.js
│   ├── models/            # Mongoose schemas
│   ├── routes/            # Routes API
│   ├── utils/             # jwt.js
│   ├── scripts/           # Seeds et tests
│   ├── index.js           # Point d'entrée serveur
│   └── .env               # Variables d'environnement (à remplir)
└── clientKyswa/           # Frontend React
    └── src/
        ├── api/           # axios.js (instance configurée)
        ├── components/    # Navbar
        └── pages/
            ├── Home.jsx
            └── public/
                ├── SuiviReservation.jsx
                └── SuiviBillet.jsx
```

---

## Lancer l'application

**Prérequis** : Node.js v20+

**Backend** (terminal 1) :
```bash
cd serverKyswa
npm install
npm run dev
```
Serveur sur `http://localhost:3000`

**Frontend** (terminal 2) :
```bash
cd clientKyswa
npm install
npm run dev
```
App sur `http://localhost:5173`

---

## Variables d'environnement

Fichier `serverKyswa/.env` à compléter :

```
MONGO_URI=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PORT=3000
```

---

## API — Routes principales

### Authentification (public)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Connexion (JWT) |

### Suivi public (sans login)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/public/reservation` | Suivi réservation par numéro + nom |
| GET | `/api/public/billet` | Suivi billet par numéro + nom |

### Routes protégées (JWT requis)
| Route | Rôles |
|-------|-------|
| `/api/users` | ADMIN |
| `/api/profile` | Tous |
| `/api/clients` | Tous |
| `/api/packages` | GESTIONNAIRE (écriture), Tous (lecture) |
| `/api/supplements` | GESTIONNAIRE |
| `/api/reservations` | COMMERCIAL, GESTIONNAIRE, COMPTABLE |
| `/api/billets` | COMMERCIAL, GESTIONNAIRE, COMPTABLE |
| `/api/documents` | COMMERCIAL, COMPTABLE, ADMIN |
| `/api/factures` | COMMERCIAL, COMPTABLE, ADMIN |

---

## Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| ADMIN | Tout + gestion utilisateurs |
| GESTIONNAIRE | Packages, suppléments, réservations |
| COMMERCIAL | Clients, réservations, billets |
| COMPTABLE | Paiements, factures, documents |

---

## Pages frontend

| URL | Description | Auth |
|-----|-------------|------|
| `/` | Page d'accueil | Non |
| `/suivi/reservation` | Suivi réservation public | Non |
| `/suivi/billet` | Suivi billet public | Non |

---

## Avancement

| Étape | Description | Statut |
|-------|-------------|--------|
| 1–6 | Auth, Users, Clients, Packages, Suppléments, Réservations | ✅ |
| 7 | Paiements (Réservations + Billets) | ✅ |
| 8 | Génération factures PDF | ✅ |
| 9 | Documents + upload Cloudinary | ✅ |
| 10 | Suivi public réservation + billet | ✅ |
| 11 | Dashboard frontend par rôle | 🔜 |
| 12 | Sécurité + robustesse backend | 🔜 |
| 13–18 | Tests, déploiement, polish | 🔜 |
