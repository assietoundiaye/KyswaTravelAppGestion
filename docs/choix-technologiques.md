# Choix Technologiques — Kyswa Travel

## 1. Stack principale : MERN

### Pourquoi MERN ?

Le choix de la stack MERN (MongoDB, Express, React, Node.js) repose sur plusieurs critères adaptés au contexte du projet :

- **Langage unique** : JavaScript/TypeScript côté client et serveur, ce qui réduit le coût de montée en compétence et facilite le partage de logique (validation, constantes, types)
- **Écosystème riche** : npm offre des milliers de packages matures pour chaque besoin (auth, upload, PDF, temps réel)
- **Rapidité de développement** : la flexibilité de MongoDB et la réactivité de React permettent d'itérer rapidement sur les fonctionnalités métier
- **Adapté aux SPA** : React est conçu pour les applications monopage avec état complexe, ce qui correspond à un dashboard multi-rôles

---

## 2. Base de données : MongoDB Atlas

### Pourquoi MongoDB plutôt que SQL ?

| Critère | MongoDB | SQL (PostgreSQL/MySQL) |
|---|---|---|
| Schéma | Flexible, évolutif sans migration | Rigide, migrations nécessaires |
| Documents imbriqués | Natif (paiements dans réservation) | Jointures multiples |
| Déploiement cloud | Atlas géré, gratuit en tier M0 | Nécessite serveur dédié |
| Scalabilité | Horizontale native | Verticale principalement |

Dans ce projet, les documents imbriqués (paiements dans réservations, clients dans inscriptions) sont naturellement représentés en JSON, ce qui correspond au modèle document de MongoDB.

### Mongoose ODM
Mongoose apporte la validation de schéma, les hooks pre/post save, les virtuals (resteAPayer calculé) et les méthodes d'instance, comblant le manque de contraintes natif de MongoDB.

---

## 3. Serveur : Node.js / Express

### Node.js
- Modèle événementiel non-bloquant adapté aux I/O intensives (requêtes DB, uploads)
- Partage du runtime JavaScript avec le frontend
- Performances suffisantes pour une application interne (< 100 utilisateurs simultanés)

### Express
- Framework minimaliste permettant un contrôle total sur le routing et les middlewares
- Middleware chain claire : CORS → JSON → Auth → Route → ErrorHandler
- Facilité d'intégration avec Socket.IO sur le même serveur HTTP

---

## 4. Frontend : React + Vite

### React
- Composants réutilisables (Modal, DataTable, Toast, Sidebar)
- Gestion d'état local avec hooks (useState, useEffect, useMemo)
- Context API pour l'authentification globale (AuthContext)
- React Router v6 pour le routing déclaratif avec routes protégées

### Vite
- Build tool ultra-rapide (HMR < 100ms vs Webpack ~2s)
- Configuration minimale
- Support natif ESM

### Tailwind CSS + CSS Variables
- Tailwind pour les utilitaires de layout (grid, flex, responsive)
- CSS Variables personnalisées pour le design system premium (couleurs, ombres, rayons)
- Approche hybride permettant des composants stylés inline avec cohérence visuelle

---

## 5. Authentification : JWT

### Pourquoi JWT plutôt que sessions ?

| Critère | JWT | Sessions serveur |
|---|---|---|
| Stateless | Oui (pas de stockage serveur) | Non (Redis/DB nécessaire) |
| Scalabilité | Horizontale facile | Partage de session requis |
| Mobile/SPA | Natif (Authorization header) | Cookies complexes |

### Stratégie double token
- **Access token** (7 jours) : payload `{id, role, nom, prenom}`, utilisé pour chaque requête
- **Refresh token** (30 jours) : renouvellement automatique via intercepteur Axios sans déconnecter l'utilisateur

### Sécurité
- Hachage bcrypt (salt 10) pour les mots de passe
- Rate limiting sur `/api/auth/login` (5 tentatives / 15 min)
- Validation des types d'entrée (protection CWE-1287)
- Blocage immédiat des comptes INACTIF à chaque requête

---

## 6. Temps réel : Socket.IO

### Pourquoi Socket.IO ?
- WebSocket avec fallback automatique (long-polling si WebSocket bloqué)
- Rooms natives pour les conversations privées (`user_${id}`)
- Gestion de la reconnexion automatique
- Compatible avec le serveur HTTP Express existant (pas de serveur séparé)

### Utilisation dans le projet
- Messagerie interne temps réel
- Badge de messages non lus mis à jour instantanément
- Indicateur de connexion (connecté/hors ligne)

---

## 7. Upload fichiers : Cloudinary + Multer

### Multer
- Stockage en mémoire (buffer) pour éviter les fichiers temporaires sur disque
- Validation du type MIME avant upload
- Limite de taille : 10 MB

### Cloudinary
- CDN mondial pour la distribution des fichiers
- Transformation d'images à la volée
- URL sécurisées HTTPS
- Suppression des fichiers via `public_id` lors de la suppression en DB

---

## 8. Génération PDF : jsPDF + jspdf-autotable

- Génération côté serveur (Node.js) pour éviter les dépendances navigateur
- Tables automatiques pour les listes de paiements
- Logo intégrable via base64
- Envoi direct en réponse HTTP (`Content-Type: application/pdf`)

---

## 9. Validation : express-validator

- Validation déclarative des corps de requête
- Messages d'erreur en français
- Protection contre les injections et les types inattendus
- Utilisé sur toutes les routes POST/PATCH

---

## 10. Sécurité globale

| Mesure | Implémentation |
|---|---|
| Brute-force | express-rate-limit sur /auth/login |
| Injection | Mongoose ODM + express-validator |
| CORS | Origines whitelist (localhost:5173) |
| Mots de passe | bcrypt salt 10 |
| Tokens | JWT HS256, expiration courte |
| Comptes | Blocage INACTIF à chaque requête |
| Suppression | Impossible sur son propre compte |
| Rôles | requireRole() sur chaque route sensible |
