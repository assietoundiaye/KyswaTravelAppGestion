# Fonctionnalités Implémentées — Kyswa Travel

## 1. Authentification et Gestion des Accès

### Connexion
- Authentification par email ou numéro de téléphone
- Protection brute-force : 5 tentatives max / 15 minutes (express-rate-limit)
- Génération de JWT (access token 7j + refresh token 30j)
- Renouvellement automatique du token via intercepteur Axios
- Blocage immédiat des comptes désactivés (INACTIF)

### Rôles et permissions
9 rôles distincts avec menus et accès différenciés :

| Rôle | Accès principal |
|---|---|
| `dg` | Vision globale, tous les modules |
| `administrateur` | Gestion système, utilisateurs, audit |
| `comptable` | Finances, paiements, comptabilité |
| `oumra` | Inscriptions, visas, billets groupe |
| `commercial` | Clients, inscriptions, recouvrement |
| `secretaire` | Coordination, documents, réunions |
| `billets` | Billets individuels et groupe |
| `ziara` | Prospects Ziarra Fès |
| `social` | Messagerie, rapports |

---

## 2. Gestion des Clients (CRM)

- Création de fiche client complète : identité, contact, documents
- Champs : nom, prénom, date/lieu de naissance, téléphone, email, adresse
- Documents : N° passeport, date expiration, N° CNI
- Niveau de fidélité : BRONZE / ARGENT / OR / PLATINE
- Historique des voyages (Hajj, Oumra, Ziarra, Autre)
- Visas détenus avec dates d'expiration
- Recherche par nom, téléphone ou numéro de passeport
- Upload de documents (passeport PDF) via Cloudinary

---

## 3. Inscriptions (Réservations)

- Numérotation automatique : `INS-YYYY-NNN`
- Sélection du package avec affichage des prix par type de chambre
- Auto-remplissage des dates depuis le package sélectionné
- Auto-calcul du montant selon le type de chambre choisi
- Sélection multiple de clients avec recherche filtrée
- Types de chambre : SINGLE, DOUBLE, TRIPLE, QUADRUPLE, SUITE
- Formules : LOGEMENT_SEUL → ALL_INCLUSIVE_PREMIUM
- Deux statuts séparés :
  - **Statut client** : INSCRIT → CONFIRME → PARTI → RENTRE / DESISTE
  - **Statut paiement** : EN_ATTENTE → PARTIEL → SOLDE (auto-calculé)
- Tableau paginé (20 lignes/page) avec badges colorés
- Suppression désactivée pour tous les rôles

---

## 4. Paiements

- Enregistrement de versements sur inscriptions ou billets
- Modes : ESPECES, VIREMENT, CHEQUE, CARTE_BANCAIRE, ORANGE_MONEY, WAVE, MONEY, AUTRE
- Affichage du récapitulatif (package, total dû, déjà reçu, reste) lors de la saisie
- Mise à jour automatique du statut paiement après chaque versement
- Suppression réservée au rôle `comptable` uniquement
- Tableau avec colonnes : date, inscription/billet, client, mode, référence, montant

---

## 5. Packages / Départs

- Création d'offres de voyage : OUMRA, HAJJ, ZIAR_FES, ZIARRA, TOURISME, BILLET
- Prix par type de chambre (Single, Double, Triple, Quadruple)
- Informations vol : compagnie, numéro de vol, ville départ/arrivée
- Hôtels associés (liste)
- Quota max et compteur de places réservées
- Statuts : OUVERT, COMPLET, ANNULE, TERMINE
- Checklist pré-départ : visa OK, billets OK, santé, bagages
- Création/modification réservée à `dg` et `administrateur`

---

## 6. Visas

- Création de dossier visa par client/inscription
- Suivi des étapes : passeport collecté → envoyé sur Nusuk → visa reçu/refusé
- Saisie du motif de refus si visa refusé
- Indicateurs visuels par étape (icônes cochées/non cochées)

---

## 7. Billets

### Billets individuels
- Création avec client, compagnie, classe, destination, dates
- Types : aller simple / aller-retour
- Suivi des paiements avec reste à payer
- Annulation (statut ANNULE, pas de suppression)

### Billets groupe
- Vols négociés avec compagnie aérienne
- Numéros de vol aller/retour, dates, places, tarif unitaire
- Statuts : EN_ATTENTE → CONFIRME → ANNULE

---

## 8. Désistements

- Création d'un dossier de désistement sur une inscription
- Calcul automatique du taux de remboursement selon la grille :
  - ≥ 60 jours avant départ → 100%
  - 30–59 jours → 80%
  - 15–29 jours → 50%
  - 1–14 jours → 25%
  - 0 jour → 0%
- Affichage du montant remboursable en temps réel
- Mise à jour du statut inscription en DESISTE
- Validation du remboursement réservée au `comptable`

---

## 9. Recouvrement

- Liste des inscriptions impayées à moins de 30 jours du départ
- Code couleur selon urgence (rouge ≤ 7 jours, orange ≤ 30 jours)
- Enregistrement de relances téléphoniques avec résultat (JOINT, NON_JOINT, PROMESSE, REFUS)
- Remboursements en attente visibles pour `comptable` et `dg` uniquement
- Commerciaux : voient uniquement les impayés

---

## 10. Réunions Pré-départ

- Planification de réunions avec titre, date/heure, lieu, ordre du jour, participants
- Checklist pré-départ par départ (visa OK, billets OK, santé, bagages)
- Calendrier mensuel dans le dashboard avec points de couleur
- Suppression réservée à `dg` et `administrateur`

---

## 11. Comptabilité

- Enregistrement des dépenses par catégorie : LOYER, SALAIRES, FOURNITURES, TRANSPORT, COMMUNICATION, MARKETING, TAXES, AUTRE
- Filtre par mois
- Calcul du solde : total encaissé − total dépenses
- Accès réservé à `comptable`, `dg`

---

## 12. Bilan Départs

- Vue synthétique par départ : nb inscrits, quota, taux de remplissage
- Total dû, total encaissé, reste global par départ
- Répartition par statut d'inscription
- Détail par départ avec liste des inscrits et leurs paiements

---

## 13. Messagerie Interne

- Interface deux colonnes : liste conversations / zone de chat
- Messages en temps réel via Socket.IO (sans rechargement)
- Badge rouge avec compteur de messages non lus dans la sidebar
- Marquage automatique comme lu
- Indicateur de connexion temps réel (vert/rouge)

---

## 14. Rapports Quotidiens

- Formulaire de rapport journalier pour chaque agent
- Sections communes : activités, problèmes, objectifs du lendemain
- Sections spécifiques par rôle :
  - **Commercial** : liste dynamique d'appels clients, stats appels/inscriptions/paiements, suivi commercial, constats
  - **Social** : plateformes utilisées (Facebook, Instagram, TikTok, YouTube, WhatsApp), vues, abonnés, likes, campagnes, budget
  - **Administrateur** : articles publiés, packages MAJ, état du site, problèmes réglés
- Modification possible dans les 7 jours, verrouillé ensuite
- Suivi des rapports du jour dans le dashboard (✅ soumis / ❌ non soumis)

---

## 15. Secrétariat (module Secrétaire)

5 onglets :
1. **Urgences** : documents URGENT + échéance ≤ 7 jours avec alertes visuelles
2. **Documents** : création, changement de statut inline, upload PDF
3. **Réunions DG** : planification avec ordre du jour et participants
4. **Rapports journaliers** : filtre par date, vue détaillée par employé
5. **Supervision** : rapports des profils informatique et social

---

## 16. Gestion des Utilisateurs

- Liste avec avatar initiales coloré par rôle
- Création via modal avec bouton œil pour le mot de passe
- Modification de profil (nom, prénom, téléphone, rôle)
- Activation/désactivation de compte (effet immédiat)
- Suppression définitive (impossible sur son propre compte)

---

## 17. Journal d'Audit (Traçabilité)

- 5 compteurs : total, connexions, créations, modifications, suppressions
- Filtres : recherche texte, module, type d'action
- Tableau avec code couleur par action :
  - Vert : CONNEXION
  - Gris : DECONNEXION
  - Bleu : CREATION
  - Orange : MODIFICATION
  - Rouge : SUPPRESSION
- Modal détail avec données JSON formatées

---

## 18. Simulateur de Prix

- Calcul estimatif sans créer d'inscription
- Sélection package, type de chambre, services
- Mise à jour du total en temps réel

---

## 19. Ziarra Fès

- Gestion des prospects avec statuts : PROSPECT → INTERESSE → CONFIRME → PARTI → ANNULE
- Lien optionnel avec un client existant
- Création, modification, suppression

---

## 20. Fonctionnalités Transversales

### Dashboard
- KPI colorés (inscriptions, paiements, clients, départs)
- Accès rapide filtré par rôle
- Calendrier des réunions avec navigation mensuelle
- Suivi des rapports du jour par employé
- Montants financiers masqués pour les rôles non-financiers

### Pages publiques (sans connexion)
- Suivi d'inscription par numéro
- Suivi de billet par numéro

### Export
- Export CSV : clients, réservations, billets
- Génération PDF : factures réservations et billets (avec logo, paiements, totaux)

### Responsive
- Sidebar en tiroir sur mobile (hamburger)
- Tableaux scrollables horizontalement
- Grilles adaptatives
