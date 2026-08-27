# Module Kyswa Shop

## 📦 Vue d'ensemble

Le module **Kyswa Shop** permet à l'entreprise Kyswa Travel de gérer et vendre des produits en complément de ses services de voyage. Il offre une interface complète pour la gestion du catalogue, du stock et des ventes.

## 🎯 Fonctionnalités

### ✅ Gestion des produits
- Création, modification et suppression de produits
- Catégorisation (Voyage, Transport, Hébergement, Accessoires, Services, Souvenirs, Autre)
- Informations détaillées (description, dimensions, poids, fournisseur, tags)
- Gestion des codes-barres et références

### 📊 Gestion du stock
- Stock initial et minimum configurable
- Ajustements de stock (Ajout, Retrait, Définir valeur)
- Alertes automatiques de rupture de stock
- Traçabilité des mouvements avec motifs

### 💰 Gestion tarifaire
- Prix normal et prix promotionnel
- Calcul automatique des remises
- Affichage formaté en FCFA

### 🔍 Recherche et filtres
- Recherche textuelle multi-critères
- Filtres par catégorie et statut
- Pagination des résultats

### 📈 Statistiques
- Dashboard avec métriques en temps réel
- Statistiques par catégorie
- Valeur totale du stock
- Alertes produits en rupture

## 👥 Permissions par rôle

### 🔓 Accès complet (Création, Modification, Suppression, Stock)
- **Commercial** - Gestion complète du catalogue
- **Responsable Oumra/Hajj** - Gestion complète
- **Responsable Billets** - Gestion complète  
- **Responsable Ziarra** - Gestion complète

### 👁️ Accès lecture seule (Consultation uniquement)
- **Directeur Général** - Consultation et supervision
- **Administrateur** - Consultation et supervision
- **Comptable** - Consultation pour rapports financiers
- **Secrétaire** - Consultation des informations
- **Social** - Consultation basique

## 🚀 Utilisation

### Créer un produit
1. Cliquer sur **"Nouveau Produit"**
2. Remplir les informations obligatoires :
   - Nom du produit
   - Catégorie
   - Prix (en FCFA)
3. Ajouter les informations optionnelles :
   - Description, marque, référence
   - Stock initial et minimum
   - Dimensions et poids
   - Informations fournisseur
   - Tags pour la recherche
4. **Sauvegarder**

### Ajuster le stock
1. Cliquer sur l'icône 📊 d'un produit
2. Choisir le type d'ajustement :
   - **Ajout** : Ajouter au stock existant
   - **Retrait** : Retirer du stock existant  
   - **Définir** : Fixer une nouvelle valeur
3. Saisir la quantité
4. Ajouter un motif (optionnel mais recommandé)
5. **Valider**

### Rechercher des produits
- **Barre de recherche** : Recherche dans nom, description, référence, tags
- **Filtre catégorie** : Filtrer par type de produit
- **Filtre statut** : Actif, Inactif, Rupture stock, Archivé
- **Navigation** : Utiliser la pagination pour parcourir les résultats

## 🔧 Structure technique

### Frontend (`clientKyswa/src/pages/dashboard/shop/`)
- **ShopPage.jsx** - Page principale avec tableau des produits
- **ProduitModal.jsx** - Modal de création/édition
- **StockAdjustmentModal.jsx** - Modal d'ajustement de stock
- **usePermissions.js** - Hook pour la gestion des permissions

### Backend (`serverKyswa/`)
- **models/Produit.js** - Modèle MongoDB avec validation
- **routes/shop.js** - API REST endpoints
- **config/permissions.js** - Configuration des permissions

### Services
- **shopService.js** - Service frontend pour les appels API
- Validation côté client et serveur
- Formatage des prix et données

## 🛠️ API Endpoints

```
GET    /api/shop/produits              - Liste des produits (avec filtres)
POST   /api/shop/produits              - Créer un produit  
GET    /api/shop/produits/:id          - Détail d'un produit
PATCH  /api/shop/produits/:id          - Modifier un produit
DELETE /api/shop/produits/:id          - Supprimer un produit
POST   /api/shop/produits/:id/ajuster-stock - Ajuster le stock
GET    /api/shop/statistiques          - Statistiques générales
GET    /api/shop/categories            - Liste des catégories
```

## 📱 Interface utilisateur

### Indicateurs visuels
- 🔴 **Rupture de stock** : Stock ≤ stock minimum
- 🟢 **Disponible** : Stock > stock minimum  
- 💰 **Prix promo** : Prix barré + nouveau prix
- 🏷️ **Tags** : Recherche facilité
- 📊 **Statuts** : Codes couleur par statut

### Mode lecture seule
- Bannière d'information bleue
- Boutons d'action masqués
- Message "Lecture seule" dans les actions
- Accès complet aux informations de consultation

## 🔒 Sécurité

### Validation des données
- Validation côté client (React)
- Validation côté serveur (Mongoose)
- Sanitisation des entrées utilisateur
- Gestion des erreurs complète

### Permissions
- Authentification JWT obligatoire
- Permissions granulaires par action
- Vérification côté client et serveur
- Audit des actions (via middleware)

## 📋 Modèle de données

```javascript
{
  nom: String,              // Nom du produit
  description: String,      // Description détaillée
  categorie: Enum,         // Type de produit
  prix: Decimal,           // Prix en FCFA
  prixPromo: Decimal,      // Prix promotionnel
  stock: Number,           // Stock actuel
  stockMin: Number,        // Seuil d'alerte
  statut: Enum,           // ACTIF, INACTIF, etc.
  reference: String,       // Référence unique
  codeBarres: String,      // Code-barres
  marque: String,          // Marque
  dimensions: {            // Dimensions
    longueur: Number,
    largeur: Number, 
    hauteur: Number,
    unite: String
  },
  poids: Number,          // Poids en kg
  tags: [String],         // Tags de recherche
  fournisseur: {          // Infos fournisseur
    nom: String,
    contact: String,
    telephone: String,
    email: String
  },
  // Métadonnées système
  dateCreation: Date,
  creeParUtilisateurId: ObjectId,
  // ...
}
```

## 🔄 Extensions futures possibles

1. **Upload d'images** produits
2. **Codes-barres** : Scanner et génération  
3. **Commandes fournisseurs** automatiques
4. **Point de vente** intégré
5. **E-commerce** : Boutique en ligne
6. **Rapports avancés** : Analyses de vente
7. **Notifications** : Alertes automatiques
8. **Mobile** : Application mobile

## 📞 Support

Pour toute question ou problème :
- Consulter les logs serveur (`serverKyswa/`)
- Vérifier la console navigateur (F12)
- Contrôler les permissions utilisateur
- Vérifier la connectivité MongoDB

## 📝 Changelog

**v1.0.0** (Janvier 2025)
- ✅ Création du module
- ✅ CRUD complet des produits
- ✅ Gestion du stock avec ajustements
- ✅ Système de permissions par rôle
- ✅ Interface responsive et intuitive
- ✅ Statistiques en temps réel
- ✅ Recherche et filtres avancés