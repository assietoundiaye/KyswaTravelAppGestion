# Architecture Technique — Kyswa Travel

## 1. Vue d'ensemble

Kyswa Travel est une application web de gestion interne pour une agence de voyages religieux (Oumra, Hajj, Ziarra). Elle repose sur une architecture **MERN** (MongoDB, Express, React, Node.js) avec communication temps réel via Socket.IO.

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT (React/Vite)                │
│  Port 5173 — SPA avec routing côté client (React Router) │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/REST + WebSocket
┌────────────────────▼────────────────────────────────┐
│              SERVEUR (Node.js / Express)             │
│  Port 3000 — API REST + Socket.IO                   │
└────────────────────┬────────────────────────────────┘
                     │ Mongoose ODM
┌────────────────────▼────────────────────────────────┐
│              BASE DE DONNÉES (MongoDB Atlas)         │
│  Collections : utilisateurs, clients, reservations, │
│  billets, paiements, packages, documents, messages… │
└─────────────────────────────────────────────────────┘
```

---

## 2. Structure des dossiers

```
KyswaTravelAppGestion/
├── serverKyswa/          # Backend Node.js/Express
│   ├── config/           # Configuration Cloudinary
│   ├── middleware/        # auth.js, errorHandler.js
│   ├── models/           # Schémas Mongoose
│   ├── routes/           # Routes Express
│   ├── utils/            # jwt.js
│   └── index.js          # Point d'entrée serveur
│
└── clientKyswa/          # Frontend React/Vite
    └── src/
        ├── api/          # Instance Axios configurée
        ├── components/   # Composants réutilisables
        ├── context/      # AuthContext (JWT)
        ├── hooks/        # useSocket.js
        ├── pages/        # Pages par module
        └── utils/        # roles.js (config rôles)
```

---

## 3. Backend — Node.js / Express

### 3.1 Point d'entrée (`index.js`)

- Initialisation Express + HTTP server
- Configuration Socket.IO avec CORS
- Connexion MongoDB Atlas via Mongoose
- Enregistrement de toutes les routes
- Middlewares globaux : CORS, JSON, Morgan, debug logger

### 3.2 Middleware d'authentification (`middleware/auth.js`)

```
protect()       → Vérifie le Bearer JWT, attache req.user
requireRole()   → Factory : restreint l'accès par rôle(s)
```

Le middleware bloque immédiatement les comptes `INACTIF`.

### 3.3 Utilitaire JWT (`utils/jwt.js`)

| Fonction | Description |
|---|---|
| `generateToken(user)` | JWT 7 jours avec payload `{id, role, nom, prenom}` |
| `generateRefreshToken(user)` | JWT 30 jours pour renouvellement |
| `verifyToken(token)` | Décode et valide un JWT |

---

## 4. Modèles de données (Mongoose)

### 4.1 Utilisateur

```javascript
{
  nom, prenom, email (unique), telephone (sparse),
  password (bcrypt, select: false),
  role: enum ['dg','administrateur','comptable','oumra',
              'commercial','secretaire','billets','ziara','social'],
  etat: enum ['ACTIF','INACTIF'],
  dateDerniereConnexion
}
```

### 4.2 Client

```javascript
{
  nom, prenom, dateNaissance, lieuNaissance,
  telephone, email, adresse,
  numeroPasseport (unique, required),
  dateExpirationPasseport,
  numeroCNI (sparse),
  niveauFidelite: enum ['BRONZE','ARGENT','OR','PLATINE'],
  referentId → Utilisateur,
  visasDetenuts: [{ type, dateExpiration, numero }],
  historiqueVoyages: [{ type, annee, agence, notes }]
}
```

### 4.3 Reservation (Inscription)

```javascript
{
  numero: 'INS-YYYY-NNN' (auto-généré),
  packageKId → PackageK (required),
  clients: [→ Client],
  paiements: [→ Paiement],
  typeChambre: enum ['SINGLE','DOUBLE','TRIPLE','QUADRUPLE','SUITE'],
  formule, niveauConfort,
  dateDepart, dateRetour (required),
  montantTotalDu (required),
  statutClient: enum ['INSCRIT','CONFIRME','DESISTE','PARTI','RENTRE','ANNULE'],
  statutPaiement: enum ['EN_ATTENTE','PARTIEL','SOLDE'],
  notes,
  // Virtual: resteAPayer = montantTotalDu - Σ paiements
}
```

### 4.4 PackageK (Départ)

```javascript
{
  nomReference (unique, required),
  type: enum ['OUMRA','HAJJ','ZIAR_FES','ZIARRA','TOURISME','BILLET'],
  statut: enum ['OUVERT','COMPLET','ANNULE','TERMINE'],
  dateDepart, dateRetour (required),
  prixSingle, prixDouble, prixTriple, prixQuadruple (Decimal128),
  compagnieAerienne, numeroVol, villeDepart, villeArrivee,
  hotel: [String],
  quotaMax (required), placesReservees,
  checklist: { visaOK, billetsOK, santeOK, bagagesOK },
  supplements: [→ Supplement]
}
```

### 4.5 Paiement

```javascript
{
  montant (Decimal128),
  dateReglement, mode: enum ['ESPECES','VIREMENT','CHEQUE',
    'CARTE_BANCAIRE','ORANGE_MONEY','WAVE','MONEY','AUTRE'],
  reference,
  reservationId → Reservation,
  billetId → Billet,
  creeParUtilisateurId → Utilisateur
}
```

### 4.6 Autres modèles

| Modèle | Description |
|---|---|
| `Billet` | Billet individuel avec client, compagnie, destination |
| `BilletGroupe` | Vol groupé négocié avec compagnie |
| `Visa` | Dossier visa par client/inscription |
| `Desistement` | Annulation avec calcul automatique remboursement |
| `Reunion` | Réunion pré-départ avec checklist |
| `Relance` | Relance téléphonique recouvrement |
| `Document` | Fichier uploadé (Cloudinary) |
| `Message` | Messagerie interne |
| `AuditLog` | Journal des actions utilisateurs |
| `RapportQuotidien` | Rapport journalier par agent |
| `Depense` | Dépense comptable |
| `ZiarraProspect` | Prospect voyage Ziarra Fès |

---

## 5. API REST — Routes

### Authentification
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Connexion (email ou téléphone) |
| POST | `/api/auth/register` | Création compte |
| POST | `/api/auth/refresh` | Renouvellement access token |

### Gestion métier
| Préfixe | Module |
|---|---|
| `/api/clients` | CRM clients |
| `/api/reservations` | Inscriptions |
| `/api/billets` | Billets individuels |
| `/api/billets-groupe` | Vols groupés |
| `/api/paiements` | Versements |
| `/api/packages` | Départs/offres |
| `/api/supplements` | Suppléments |
| `/api/visas` | Dossiers visa |
| `/api/desistements` | Annulations |
| `/api/reunions` | Réunions pré-départ |
| `/api/recouvrement` | Impayés + relances |
| `/api/bilan` | Bilan financier par départ |
| `/api/comptabilite` | Dépenses + solde |
| `/api/rapports` | Rapports quotidiens |
| `/api/messages` | Messagerie interne + audit |
| `/api/stats` | Statistiques globales |
| `/api/export` | Export CSV |
| `/api/factures` | Génération PDF |
| `/api/ziarra` | Prospects Ziarra |
| `/api/public` | Suivi public (sans auth) |

### Sécurité des routes
Toutes les routes (sauf `/api/public` et `/api/auth`) sont protégées par `protect()`. Les opérations sensibles utilisent `requireRole()` :

- Suppression paiements → `comptable` uniquement
- Gestion utilisateurs → `administrateur` uniquement
- Création packages → `dg`, `administrateur`
- Export CSV → `administrateur`, `dg`, `comptable`

---

## 6. Communication temps réel — Socket.IO

```javascript
// Connexion avec authentification
io.on('connection', (socket) => {
  socket.join(`user_${userId}`);  // Room privée par utilisateur

  socket.on('send_message', async (data) => {
    // Sauvegarde en DB + émission temps réel
    io.to(`user_${destinataireId}`).emit('new_message', message);
    socket.emit('message_sent', message);
  });
});
```

Le hook `useSocket.js` côté client gère :
- Connexion persistante (instance singleton)
- Badge de messages non lus
- Indicateur de connexion (connecté/hors ligne)

---

## 7. Stockage fichiers — Cloudinary

Les documents (passeports, PDF) sont uploadés via Multer (mémoire) puis streamés vers Cloudinary. L'URL sécurisée est stockée dans MongoDB.

```
Client → Multer (buffer) → Cloudinary → URL stockée en DB
```

---

## 8. Authentification JWT

```
Login → { token (7j), refreshToken (30j) }
         ↓
localStorage → Authorization: Bearer <token>
         ↓
Expiration 401 → Intercepteur Axios → POST /auth/refresh
         ↓
Nouveau token → Retry requête originale
```
