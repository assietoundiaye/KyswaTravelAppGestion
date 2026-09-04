/**
 * @fileoverview RoomingRepository — Gestion des tables rooming_chambres & rooming_occupants
 */

const prisma = require('../../../database/client');

class RoomingRepository {
  /**
   * Récupérer le départ avec ses inscriptions et ses clients
   */
  async getDepartDetails(departId) {
    const depart = await prisma.departs.findUnique({
      where: { id: departId },
      include: {
        inscriptions: {
          include: {
            clients: true,
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    // Chercher aussi si des hôtels sont enregistrés dans package_hotels
    let packageHotels = [];
    try {
      packageHotels = await prisma.package_hotels.findMany({
        where: { package_id: departId },
      });
    } catch (e) {
      // Optionnel si table non liée directement à departs
    }

    return { depart, packageHotels };
  }

  /**
   * Récupérer toutes les chambres d'un départ pour une ville (ou les deux)
   */
  async getChambres(departId, ville = null) {
    let sql = `
      SELECT 
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', o.id,
              'lit_numero', o.lit_numero,
              'inscription_id', i.id,
              'numero_inscription', i.numero,
              'type_chambre_souhaite', i.type_chambre,
              'client_id', cl.id,
              'nom', cl.nom,
              'prenom', cl.prenom,
              'genre', COALESCE(cl.genre, 'HOMME'),
              'telephone', cl.telephone,
              'n_passeport', cl.n_passeport,
              'photo_url', cl.photo_url
            )
          ) FILTER (WHERE o.id IS NOT NULL),
          '[]'
        ) AS occupants
      FROM public.rooming_chambres c
      LEFT JOIN public.rooming_occupants o ON o.chambre_id = c.id
      LEFT JOIN public.inscriptions i ON i.id = o.inscription_id
      LEFT JOIN public.clients cl ON cl.id = i.client_id
      WHERE c.depart_id = $1::uuid
    `;

    const params = [departId];

    if (ville) {
      sql += ` AND LOWER(c.ville) = LOWER($2)`;
      params.push(ville);
    }

    sql += ` GROUP BY c.id ORDER BY c.numero_chambre ASC`;

    return await prisma.$queryRawUnsafe(sql, ...params);
  }

  /**
   * Créer une chambre
   */
  async createChambre({ departId, ville, nomHotel, numeroChambre, etage, typeChambre, capacite, genreChambre, notes }) {
    const result = await prisma.$queryRaw`
      INSERT INTO public.rooming_chambres (
        depart_id, ville, nom_hotel, numero_chambre, etage, type_chambre, capacite, genre_chambre, notes
      ) VALUES (
        ${departId}::uuid, ${ville}, ${nomHotel || null}, ${numeroChambre}, ${etage || null},
        ${typeChambre || 'Double'}, ${capacite || 2}, ${genreChambre || 'HOMMES'}, ${notes || null}
      )
      RETURNING *
    `;
    return result[0];
  }

  /**
   * Modifier une chambre
   */
  async updateChambre(chambreId, { nomHotel, numeroChambre, etage, typeChambre, capacite, genreChambre, notes }) {
    const result = await prisma.$queryRaw`
      UPDATE public.rooming_chambres
      SET 
        nom_hotel = COALESCE(${nomHotel}, nom_hotel),
        numero_chambre = COALESCE(${numeroChambre}, numero_chambre),
        etage = COALESCE(${etage}, etage),
        type_chambre = COALESCE(${typeChambre}, type_chambre),
        capacite = COALESCE(${capacite}, capacite),
        genre_chambre = COALESCE(${genreChambre}, genre_chambre),
        notes = COALESCE(${notes}, notes),
        updated_at = NOW()
      WHERE id = ${chambreId}::uuid
      RETURNING *
    `;
    return result[0];
  }

  /**
   * Supprimer une chambre
   */
  async deleteChambre(chambreId) {
    return await prisma.$executeRaw`
      DELETE FROM public.rooming_chambres WHERE id = ${chambreId}::uuid
    `;
  }

  /**
   * Assigner un pèlerin dans une chambre
   * (retire automatiquement le pèlerin de toute autre chambre de la même ville)
   */
  async assignOccupant(chambreId, inscriptionId, litNumero = null) {
    // 1. Trouver la ville et le départ de cette chambre
    const chambreRows = await prisma.$queryRaw`
      SELECT depart_id, ville, capacite FROM public.rooming_chambres WHERE id = ${chambreId}::uuid
    `;
    if (!chambreRows || chambreRows.length === 0) {
      throw new Error('Chambre introuvable');
    }
    const { depart_id, ville, capacite } = chambreRows[0];

    // 2. Vérifier la capacité actuelle
    const occRows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM public.rooming_occupants WHERE chambre_id = ${chambreId}::uuid
    `;
    const countOccupants = occRows[0]?.count || 0;
    if (countOccupants >= capacite) {
      throw new Error(`La chambre est complète (capacité maximale de ${capacite} lits atteinte)`);
    }

    // 3. Désassigner de toute autre chambre pour la même ville et le même départ
    await prisma.$executeRaw`
      DELETE FROM public.rooming_occupants
      WHERE inscription_id = ${inscriptionId}::uuid
        AND chambre_id IN (
          SELECT id FROM public.rooming_chambres
          WHERE depart_id = ${depart_id}::uuid AND LOWER(ville) = LOWER(${ville})
        )
    `;

    // 4. Insérer dans la nouvelle chambre
    const newOccupant = await prisma.$queryRaw`
      INSERT INTO public.rooming_occupants (chambre_id, inscription_id, lit_numero)
      VALUES (${chambreId}::uuid, ${inscriptionId}::uuid, ${litNumero || countOccupants + 1})
      RETURNING *
    `;

    return newOccupant[0];
  }

  /**
   * Retirer un pèlerin d'une chambre
   */
  async unassignOccupant(chambreId, inscriptionId) {
    return await prisma.$executeRaw`
      DELETE FROM public.rooming_occupants
      WHERE chambre_id = ${chambreId}::uuid AND inscription_id = ${inscriptionId}::uuid
    `;
  }

  /**
   * Mettre à jour l'hôtel du départ pour Makkah ou Médine
   */
  async updateDepartHotel(departId, ville, nomHotel) {
    const isMakkah = ville.toLowerCase().includes('makkah') || ville.toLowerCase().includes('mecque');
    if (isMakkah) {
      await prisma.$executeRaw`
        UPDATE public.inscriptions 
        SET hotel_makkah = ${nomHotel} 
        WHERE depart_id = ${departId}::uuid
      `;
      // Mettre à jour aussi nom_hotel dans les chambres existantes si vide
      await prisma.$executeRaw`
        UPDATE public.rooming_chambres 
        SET nom_hotel = ${nomHotel} 
        WHERE depart_id = ${departId}::uuid AND LOWER(ville) LIKE '%makkah%'
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE public.inscriptions 
        SET hotel_medine = ${nomHotel} 
        WHERE depart_id = ${departId}::uuid
      `;
      await prisma.$executeRaw`
        UPDATE public.rooming_chambres 
        SET nom_hotel = ${nomHotel} 
        WHERE depart_id = ${departId}::uuid AND (LOWER(ville) LIKE '%medin%' OR LOWER(ville) LIKE '%médin%')
      `;
    }
  }
}

module.exports = RoomingRepository;
