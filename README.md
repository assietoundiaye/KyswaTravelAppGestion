# 🕌 Kyswa Travel - Plateforme de Gestion Omra & Hajj

Système de gestion interne (ERP) pour agence de voyage spécialisée au Sénégal.

## 🚀 Stack Technique

**Backend :** Node.js, Express, MongoDB/Mongoose, JWT.
**Frontend :** React 18 (Vite), Tailwind CSS, Axios.

## 📁 Structure du Projet

```text
Kyswa-Travel/
├── client/                # Application Frontend (Vite + React)
│   ├── src/
│   │   ├── components/    # Composants réutilisables (UI)
│   │   ├── context/       # Gestion d'état (Auth, UI)
│   │   ├── pages/         # Vues principales (Dashboard, Omra, etc.)
│   │   └── services/      # Appels API (Axios)
│   └── package.json
├── server/                # Application Backend (Node.js)
│   ├── config/            # Configuration (DB, Passport)
│   ├── controllers/       # Logique métier
│   ├── middleware/        # Auth, Validation, Errors
│   ├── models/            # Schémas Mongoose (User, Client, Reservation)
│   ├── routes/            # Points d'entrée API
│   └── index.js           # Point d'entrée serveur
├── .cursorrules           # Instructions IA pour Cursor
├── .gitignore             # Fichiers ignorés par Git
└── package.json           # Scripts globaux (Concurrently)