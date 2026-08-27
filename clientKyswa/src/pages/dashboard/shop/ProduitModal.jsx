import { useState, useEffect } from 'react';
import { Package, Tag, DollarSign, Hash, Ruler, Weight } from 'lucide-react';
import Modal from '../../../components/Modal';
import shopService from '../../../services/shopService';
import { toast } from '../../../components/Toast';

export default function ProduitModal({ isOpen, onClose, produit = null, onSuccess }) {
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    categorie: 'AUTRE',
    prix: '',
    prixPromo: '',
    stock: '',
    stockMin: '5',
    marque: '',
    reference: '',
    codeBarres: '',
    dimensions: {
      longueur: '',
      largeur: '',
      hauteur: '',
      unite: 'cm'
    },
    poids: '',
    tags: '',
    fournisseur: {
      nom: '',
      contact: '',
      telephone: '',
      email: ''
    },
    notes: '',
    statut: 'ACTIF'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = shopService.getCategoriesOptions().filter(cat => cat.value !== 'TOUTES');
  const isEditing = Boolean(produit);

  // Initialiser le formulaire
  useEffect(() => {
    if (isOpen) {
      if (produit) {
        // Mode édition
        setFormData({
          nom: produit.nom || '',
          description: produit.description || '',
          categorie: produit.categorie || 'AUTRE',
          prix: produit.prix?.toString() || '',
          prixPromo: produit.prixPromo?.toString() || '',
          stock: produit.stock?.toString() || '',
          stockMin: produit.stockMin?.toString() || '5',
          marque: produit.marque || '',
          reference: produit.reference || '',
          codeBarres: produit.codeBarres || '',
          dimensions: {
            longueur: produit.dimensions?.longueur?.toString() || '',
            largeur: produit.dimensions?.largeur?.toString() || '',
            hauteur: produit.dimensions?.hauteur?.toString() || '',
            unite: produit.dimensions?.unite || 'cm'
          },
          poids: produit.poids?.toString() || '',
          tags: Array.isArray(produit.tags) ? produit.tags.join(', ') : '',
          fournisseur: {
            nom: produit.fournisseur?.nom || '',
            contact: produit.fournisseur?.contact || '',
            telephone: produit.fournisseur?.telephone || '',
            email: produit.fournisseur?.email || ''
          },
          notes: produit.notes || '',
          statut: produit.statut || 'ACTIF'
        });
      } else {
        // Mode création - réinitialiser
        setFormData({
          nom: '',
          description: '',
          categorie: 'AUTRE',
          prix: '',
          prixPromo: '',
          stock: '0',
          stockMin: '5',
          marque: '',
          reference: '',
          codeBarres: '',
          dimensions: {
            longueur: '',
            largeur: '',
            hauteur: '',
            unite: 'cm'
          },
          poids: '',
          tags: '',
          fournisseur: {
            nom: '',
            contact: '',
            telephone: '',
            email: ''
          },
          notes: '',
          statut: 'ACTIF'
        });
      }
      setErrors({});
    }
  }, [isOpen, produit]);

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Supprimer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis';
    if (!formData.categorie) newErrors.categorie = 'La catégorie est requise';
    if (!formData.prix || parseFloat(formData.prix) <= 0) {
      newErrors.prix = 'Le prix doit être positif';
    }
    
    if (formData.prixPromo && parseFloat(formData.prixPromo) >= parseFloat(formData.prix)) {
      newErrors.prixPromo = 'Le prix promo doit être inférieur au prix normal';
    }
    
    if (formData.stock && parseInt(formData.stock) < 0) {
      newErrors.stock = 'Le stock ne peut pas être négatif';
    }
    
    if (formData.stockMin && parseInt(formData.stockMin) < 0) {
      newErrors.stockMin = 'Le stock minimum ne peut pas être négatif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }

    setLoading(true);
    try {
      // Préparer les données
      const produitData = {
        ...formData,
        prix: parseFloat(formData.prix),
        prixPromo: formData.prixPromo ? parseFloat(formData.prixPromo) : null,
        stock: parseInt(formData.stock) || 0,
        stockMin: parseInt(formData.stockMin) || 5,
        poids: formData.poids ? parseFloat(formData.poids) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        dimensions: {
          longueur: formData.dimensions.longueur ? parseFloat(formData.dimensions.longueur) : null,
          largeur: formData.dimensions.largeur ? parseFloat(formData.dimensions.largeur) : null,
          hauteur: formData.dimensions.hauteur ? parseFloat(formData.dimensions.hauteur) : null,
          unite: formData.dimensions.unite
        }
      };

      // Nettoyer les champs vides (sauf les booléens et nombres à 0)
      Object.keys(produitData).forEach(key => {
        if (produitData[key] === '' || (produitData[key] === null && key !== 'prixPromo' && key !== 'poids')) {
          delete produitData[key];
        }
      });

      let result;
      if (isEditing) {
        result = await shopService.updateProduit(produit._id, produitData);
        toast('Produit mis à jour avec succès', 'success');
      } else {
        result = await shopService.createProduit(produitData);
        toast('Produit créé avec succès', 'success');
      }

      console.log('Produit sauvegardé:', result);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      
      // Gestion détaillée des erreurs
      let errorMessage = 'Erreur lors de la sauvegarde du produit';
      
      if (error.response?.data?.errors) {
        // Erreurs de validation du serveur
        const validationErrors = error.response.data.errors;
        errorMessage = validationErrors.map(err => err.msg || err.message).join(', ');
      } else if (error.response?.data?.message) {
        // Message d'erreur spécifique du serveur
        errorMessage = error.response.data.message;
      } else if (error.message) {
        // Erreur réseau ou autre
        errorMessage = error.message;
      }
      
      toast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      open={isOpen} 
      onClose={onClose} 
      title={isEditing ? 'Modifier le produit' : 'Nouveau produit'} 
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Informations de base</h3>
            
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du produit *
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.nom ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Eau de Zamzam 500ml"
                />
              </div>
              {errors.nom && <p className="text-red-600 text-sm mt-1">{errors.nom}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows="3"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Description détaillée du produit..."
              />
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie *
              </label>
              <select
                value={formData.categorie}
                onChange={(e) => handleChange('categorie', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.categorie ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.categorie && <p className="text-red-600 text-sm mt-1">{errors.categorie}</p>}
            </div>

            {/* Prix */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix normal (FCFA) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prix}
                    onChange={(e) => handleChange('prix', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.prix ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                </div>
                {errors.prix && <p className="text-red-600 text-sm mt-1">{errors.prix}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix promo (FCFA)
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.prixPromo}
                    onChange={(e) => handleChange('prixPromo', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.prixPromo ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Optionnel"
                  />
                </div>
                {errors.prixPromo && <p className="text-red-600 text-sm mt-1">{errors.prixPromo}</p>}
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock actuel
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleChange('stock', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.stock ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {errors.stock && <p className="text-red-600 text-sm mt-1">{errors.stock}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock minimum
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockMin}
                  onChange={(e) => handleChange('stockMin', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.stockMin ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="5"
                />
                {errors.stockMin && <p className="text-red-600 text-sm mt-1">{errors.stockMin}</p>}
              </div>
            </div>
          </div>

          {/* Détails supplémentaires */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Détails supplémentaires</h3>
            
            {/* Marque */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marque
              </label>
              <input
                type="text"
                value={formData.marque}
                onChange={(e) => handleChange('marque', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Al-Masjid Al-Haram"
              />
            </div>

            {/* Référence et code-barres */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Référence
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => handleChange('reference', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="REF001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code-barres
                </label>
                <input
                  type="text"
                  value={formData.codeBarres}
                  onChange={(e) => handleChange('codeBarres', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123456789"
                />
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dimensions
              </label>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.dimensions.longueur}
                  onChange={(e) => handleChange('dimensions.longueur', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="L"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.dimensions.largeur}
                  onChange={(e) => handleChange('dimensions.largeur', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="l"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.dimensions.hauteur}
                  onChange={(e) => handleChange('dimensions.hauteur', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="H"
                />
                <select
                  value={formData.dimensions.unite}
                  onChange={(e) => handleChange('dimensions.unite', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            </div>

            {/* Poids */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poids (kg)
              </label>
              <div className="relative">
                <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.poids}
                  onChange={(e) => handleChange('poids', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.0"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="religieux, pèlerinage, zamzam"
              />
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={formData.statut}
                onChange={(e) => handleChange('statut', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ACTIF">Actif</option>
                <option value="INACTIF">Inactif</option>
                <option value="ARCHIVE">Archivé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Fournisseur */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Fournisseur (optionnel)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du fournisseur
              </label>
              <input
                type="text"
                value={formData.fournisseur.nom}
                onChange={(e) => handleChange('fournisseur.nom', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact
              </label>
              <input
                type="text"
                value={formData.fournisseur.contact}
                onChange={(e) => handleChange('fournisseur.contact', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom du contact"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.fournisseur.telephone}
                onChange={(e) => handleChange('fournisseur.telephone', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+33 1 23 45 67 89"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.fournisseur.email}
                onChange={(e) => handleChange('fournisseur.email', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contact@fournisseur.com"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows="3"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Notes internes, remarques..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                {isEditing ? 'Modification...' : 'Création...'}
              </>
            ) : (
              <>
                <Package className="h-4 w-4" />
                {isEditing ? 'Modifier' : 'Créer'} le produit
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}