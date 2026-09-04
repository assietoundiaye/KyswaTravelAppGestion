/**
 * @fileoverview RoomingService — Logique métier pour la répartition des chambres & statistiques comparatives
 */

const { ValidationException, BusinessException, NotFoundException } = require('../../../shared/exceptions');

class RoomingService {
  constructor(roomingRepository) {
    this.repository = roomingRepository;
  }

  /**
   * Récupérer la vue complète de répartition pour un départ et une ville
   */
  async getRoomingOverview(departId, ville = 'Makkah') {
    const { depart, packageHotels } = await this.repository.getDepartDetails(departId);
    if (!depart) {
      throw new NotFoundException('Départ introuvable');
    }

    // Récupérer les chambres pour la ville demandée
    const chambres = await this.repository.getChambres(departId, ville);

    // Déterminer les noms d'hôtels par défaut
    const hotelMakkahFromInscriptions = depart.inscriptions.find(i => i.hotel_makkah)?.hotel_makkah;
    const hotelMedineFromInscriptions = depart.inscriptions.find(i => i.hotel_medine)?.hotel_medine;
    
    const hotelMakkahFromPkg = packageHotels.find(h => (h.ville || '').toLowerCase().includes('makkah'))?.nom_hotel;
    const hotelMedineFromPkg = packageHotels.find(h => (h.ville || '').toLowerCase().includes('medin'))?.nom_hotel;

    const nomHotelMakkah = hotelMakkahFromInscriptions || hotelMakkahFromPkg || depart.hotel || 'Hôtel Makkah';
    const nomHotelMedine = hotelMedineFromInscriptions || hotelMedineFromPkg || 'Hôtel Médine';

    // Identifier les inscriptions assignées dans cette ville
    const assignedInscriptionIds = new Set();
    chambres.forEach(ch => {
      (ch.occupants || []).forEach(occ => {
        if (occ.inscription_id) assignedInscriptionIds.add(occ.inscription_id);
      });
    });

    // Séparer les pèlerins placés et non placés
    const pelerinsPlaces = [];
    const pelerinsNonPlaces = [];

    depart.inscriptions.forEach(insc => {
      const client = insc.clients || {};
      const genre = (client.genre || '').toUpperCase();
      const isHomme = genre.includes('HOMME') || genre === 'M' || genre === 'H';
      const isFemme = genre.includes('FEMME') || genre === 'F';

      const pelerinData = {
        inscriptionId: insc.id,
        numeroInscription: insc.numero,
        typeChambreSouhaite: insc.type_chambre || 'Double',
        clientId: client.id,
        nom: client.nom || '',
        prenom: client.prenom || '',
        genre: isFemme ? 'FEMME' : 'HOMME',
        telephone: client.telephone || '',
        email: client.email || '',
        nPasseport: client.n_passeport || '',
        photoUrl: client.photo_url || null,
        statutClient: insc.statut_client || 'Inscrit',
      };

      if (assignedInscriptionIds.has(insc.id)) {
        pelerinsPlaces.push(pelerinData);
      } else {
        pelerinsNonPlaces.push(pelerinData);
      }
    });

    // ── STATISTIQUES & COMPARAISONS ──
    const totalPelerins = depart.inscriptions.length;
    const totalPlaces = pelerinsPlaces.length;
    const totalNonPlaces = pelerinsNonPlaces.length;

    // Hommes vs Femmes
    const hommesInscrits = depart.inscriptions.filter(i => {
      const g = (i.clients?.genre || '').toUpperCase();
      return !g.includes('FEMME') && g !== 'F';
    }).length;
    const femmesInscrites = totalPelerins - hommesInscrits;

    const hommesPlaces = pelerinsPlaces.filter(p => p.genre === 'HOMME').length;
    const femmesPlacees = pelerinsPlaces.filter(p => p.genre === 'FEMME').length;

    const hommesRestants = hommesInscrits - hommesPlaces;
    const femmesRestantes = femmesInscrites - femmesPlacees;

    // Capacité globale des chambres créées
    let totalLitsCrees = 0;
    let totalLitsOccupes = 0;

    const parTypeChambre = {
      Single: { chambres: 0, litsOccupes: 0, litsTotal: 0 },
      Double: { chambres: 0, litsOccupes: 0, litsTotal: 0 },
      Triple: { chambres: 0, litsOccupes: 0, litsTotal: 0 },
      Quadruple: { chambres: 0, litsOccupes: 0, litsTotal: 0 },
    };

    const parGenreChambre = {
      HOMMES: { chambres: 0, litsOccupes: 0, litsTotal: 0 },
      FEMMES: { chambres: 0, litsOccupes: 0, litsTotal: 0 },
      FAMILLE: { chambres: 0, litsOccupes: 0, litsTotal: 0 },
    };

    chambres.forEach(ch => {
      const cap = ch.capacite || 2;
      const nbOcc = (ch.occupants || []).length;
      totalLitsCrees += cap;
      totalLitsOccupes += nbOcc;

      const typeKey = ch.type_chambre in parTypeChambre ? ch.type_chambre : 'Double';
      parTypeChambre[typeKey].chambres++;
      parTypeChambre[typeKey].litsOccupes += nbOcc;
      parTypeChambre[typeKey].litsTotal += cap;

      const genreKey = ch.genre_chambre in parGenreChambre ? ch.genre_chambre : 'HOMMES';
      parGenreChambre[genreKey].chambres++;
      parGenreChambre[genreKey].litsOccupes += nbOcc;
      parGenreChambre[genreKey].litsTotal += cap;
    });

    const totalLitsRestants = Math.max(0, totalLitsCrees - totalLitsOccupes);

    return {
      depart: {
        id: depart.id,
        nom: depart.nom_depart || depart.nomReference || 'Départ sans nom',
        service: depart.service || 'OUMRA',
        dateDepart: depart.date_depart,
        dateRetour: depart.date_retour,
        placesTotal: depart.places_total,
        hotelMakkah: nomHotelMakkah,
        hotelMedine: nomHotelMedine,
      },
      villeActive: ville,
      nomHotelActuel: ville.toLowerCase().includes('makkah') ? nomHotelMakkah : nomHotelMedine,
      chambres,
      pelerinsNonPlaces,
      pelerinsPlaces,
      stats: {
        totalPelerins,
        totalPlaces,
        totalNonPlaces,
        totalLitsCrees,
        totalLitsOccupes,
        totalLitsRestants,
        pourcentageRemplissage: totalPelerins > 0 ? Math.round((totalPlaces / totalPelerins) * 100) : 0,
        comparatifGenre: {
          hommes: {
            inscrits: hommesInscrits,
            places: hommesPlaces,
            restants: hommesRestants,
            pourcentage: hommesInscrits > 0 ? Math.round((hommesPlaces / hommesInscrits) * 100) : 100,
          },
          femmes: {
            inscrites: femmesInscrites,
            placees: femmesPlacees,
            restantes: femmesRestantes,
            pourcentage: femmesInscrites > 0 ? Math.round((femmesPlacees / femmesInscrites) * 100) : 100,
          },
        },
        parTypeChambre,
        parGenreChambre,
      },
    };
  }

  /**
   * Créer une chambre
   */
  async createChambre(data) {
    if (!data.departId) throw new ValidationException('departId est requis');
    if (!data.numeroChambre) throw new ValidationException('Le numéro de chambre est requis');

    const typeCapacite = {
      Single: 1,
      Double: 2,
      Triple: 3,
      Quadruple: 4,
      Quintuple: 5,
    };

    const typeChambre = data.typeChambre || 'Double';
    const capacite = data.capacite || typeCapacite[typeChambre] || 2;

    return await this.repository.createChambre({
      departId: data.departId,
      ville: data.ville || 'Makkah',
      nomHotel: data.nomHotel,
      numeroChambre: String(data.numeroChambre).trim(),
      etage: data.etage ? String(data.etage).trim() : null,
      typeChambre,
      capacite,
      genreChambre: data.genreChambre || 'HOMMES',
      notes: data.notes || null,
    });
  }

  /**
   * Génération automatique en lot de chambres
   * Ex: créer 5 chambres Double Hommes de 201 à 205
   */
  async createChambresBatch({ departId, ville, nomHotel, prefixe = '', startNumero = 1, count = 1, etage, typeChambre = 'Double', genreChambre = 'HOMMES' }) {
    const typeCapacite = { Single: 1, Double: 2, Triple: 3, Quadruple: 4, Quintuple: 5 };
    const capacite = typeCapacite[typeChambre] || 2;

    const created = [];
    for (let i = 0; i < count; i++) {
      const num = `${prefixe}${Number(startNumero) + i}`;
      const ch = await this.repository.createChambre({
        departId,
        ville,
        nomHotel,
        numeroChambre: num,
        etage,
        typeChambre,
        capacite,
        genreChambre,
      });
      created.push(ch);
    }
    return created;
  }

  /**
   * Modifier une chambre
   */
  async updateChambre(chambreId, data) {
    return await this.repository.updateChambre(chambreId, data);
  }

  /**
   * Supprimer une chambre
   */
  async deleteChambre(chambreId) {
    return await this.repository.deleteChambre(chambreId);
  }

  /**
   * Assigner un occupant avec vérification de conformité de genre
   */
  async assignOccupant(chambreId, inscriptionId, litNumero = null, forceGenre = false) {
    return await this.repository.assignOccupant(chambreId, inscriptionId, litNumero);
  }

  /**
   * Désassigner un occupant
   */
  async unassignOccupant(chambreId, inscriptionId) {
    return await this.repository.unassignOccupant(chambreId, inscriptionId);
  }

  /**
   * Mettre à jour l'hôtel assigné au séjour
   */
  async updateHotel(departId, ville, nomHotel) {
    if (!nomHotel) throw new ValidationException('Le nom de hôtel est requis');
    await this.repository.updateDepartHotel(departId, ville, nomHotel);
    return { success: true, message: `Hôtel ${ville} mis à jour : ${nomHotel}` };
  }

  /**
   * Attribution automatique intelligente
   * Regroupe les hommes et les femmes dans les chambres disponibles correspondantes
   */
  async autoAssign(departId, ville) {
    const overview = await this.getRoomingOverview(departId, ville);
    const unplaced = overview.pelerinsNonPlaces;
    const chambres = overview.chambres;

    let totalAssigned = 0;

    for (const pelerin of unplaced) {
      // Trouver une chambre ayant encore de la place et compatible avec le genre du pèlerin
      const targetChambre = chambres.find(ch => {
        const occCount = (ch.occupants || []).length;
        if (occCount >= ch.capacite) return false;
        
        if (ch.genre_chambre === 'FAMILLE') return true;
        if (pelerin.genre === 'HOMME' && ch.genre_chambre === 'HOMMES') return true;
        if (pelerin.genre === 'FEMME' && ch.genre_chambre === 'FEMMES') return true;
        return false;
      });

      if (targetChambre) {
        await this.repository.assignOccupant(targetChambre.id, pelerin.inscriptionId);
        targetChambre.occupants = targetChambre.occupants || [];
        targetChambre.occupants.push({ id: pelerin.inscriptionId });
        totalAssigned++;
      }
    }

    return {
      assignedCount: totalAssigned,
      remainingCount: unplaced.length - totalAssigned,
    };
  }
}

module.exports = RoomingService;
