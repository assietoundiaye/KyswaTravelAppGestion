import { useState, useEffect } from 'react';
import { Search, User, Phone, Mail } from 'lucide-react';
import clientService from '../../../modules/clients/services/clientService';

export default function ClientSelector({ selectedClientId, onClientSelect, className = '' }) {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchClients();
    } else {
      setClients([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (selectedClientId) {
      loadSelectedClient();
    }
  }, [selectedClientId]);

  const searchClients = async () => {
    setLoading(true);
    try {
      // Essayer d'abord la recherche spécialisée
      let response;
      try {
        response = await clientService.search(searchTerm);
      } catch (searchError) {
        console.warn('Recherche spécialisée échouée, tentative avec getAll:', searchError.message);
        
        // Fallback: utiliser getAll avec un filtre search
        response = await clientService.getAll(1, 20, { search: searchTerm });
      }
      
      // Normaliser la réponse
      const clients = response.clients || response || [];
      
      console.log(`🔍 Recherche "${searchTerm}": ${clients.length} clients trouvés`);
      setClients(clients);
      setShowDropdown(true);
    } catch (error) {
      console.error('❌ Erreur recherche clients:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la recherche de clients';
      console.error('Détails erreur:', errorMessage);
      
      // Afficher un message d'erreur à l'utilisateur
      setClients([]);
      
      // Optionnel: afficher une notification d'erreur
      if (window.toast) {
        window.toast(`Erreur de recherche: ${errorMessage}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedClient = async () => {
    try {
      const response = await clientService.getById(selectedClientId);
      
      // La réponse devrait contenir les données du client directement
      const clientData = response.client || response;
      
      setSelectedClient(clientData);
      setSearchTerm(`${clientData.nom} ${clientData.prenom}`);
    } catch (error) {
      console.error('Erreur chargement client:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du chargement du client';
      console.error('Détails erreur:', errorMessage);
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setSearchTerm(`${client.nom} ${client.prenom}`);
    setShowDropdown(false);
    onClientSelect(client._id);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (!e.target.value) {
      setSelectedClient(null);
      onClientSelect('');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Client *
      </label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
          placeholder="Rechercher un client (nom, prénom, email...)"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoComplete="off"
        />
        
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Dropdown des résultats */}
      {showDropdown && clients.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {clients.map((client) => (
            <div
              key={client._id}
              onClick={() => handleClientSelect(client)}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">
                    {client.nom} {client.prenom}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    {client.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    
                    {client.telephone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{client.telephone}</span>
                      </div>
                    )}
                  </div>
                  
                  {client.adresse && (
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {client.adresse}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client sélectionné */}
      {selectedClient && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">
              {selectedClient.nom} {selectedClient.prenom}
            </span>
            {selectedClient.email && (
              <span className="text-sm text-blue-600">
                ({selectedClient.email})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Message si aucun client trouvé */}
      {showDropdown && searchTerm.length >= 2 && clients.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-center text-gray-500">
          Aucun client trouvé pour "{searchTerm}"
        </div>
      )}
    </div>
  );
}