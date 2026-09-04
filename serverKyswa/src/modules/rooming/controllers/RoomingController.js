/**
 * @fileoverview RoomingController — Contrôleur HTTP pour la répartition des chambres
 */

class RoomingController {
  constructor(roomingService) {
    this.service = roomingService;
  }

  async getOverview(req, res, next) {
    try {
      const { departId } = req.params;
      const { ville = 'Makkah' } = req.query;
      const data = await this.service.getRoomingOverview(departId, ville);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createChambre(req, res, next) {
    try {
      const data = await this.service.createChambre(req.body);
      res.status(201).json({ success: true, data, message: 'Chambre créée avec succès' });
    } catch (error) {
      next(error);
    }
  }

  async createChambresBatch(req, res, next) {
    try {
      const data = await this.service.createChambresBatch(req.body);
      res.status(201).json({ success: true, data, message: `${data.length} chambres générées avec succès` });
    } catch (error) {
      next(error);
    }
  }

  async updateChambre(req, res, next) {
    try {
      const { id } = req.params;
      const data = await this.service.updateChambre(id, req.body);
      res.status(200).json({ success: true, data, message: 'Chambre modifiée avec succès' });
    } catch (error) {
      next(error);
    }
  }

  async deleteChambre(req, res, next) {
    try {
      const { id } = req.params;
      await this.service.deleteChambre(id);
      res.status(200).json({ success: true, message: 'Chambre supprimée avec succès' });
    } catch (error) {
      next(error);
    }
  }

  async assign(req, res, next) {
    try {
      const { chambreId, inscriptionId, litNumero, forceGenre } = req.body;
      const data = await this.service.assignOccupant(chambreId, inscriptionId, litNumero, forceGenre);
      res.status(200).json({ success: true, data, message: 'Pèlerin assigné à la chambre' });
    } catch (error) {
      next(error);
    }
  }

  async unassign(req, res, next) {
    try {
      const { chambreId, inscriptionId } = req.body;
      await this.service.unassignOccupant(chambreId, inscriptionId);
      res.status(200).json({ success: true, message: 'Pèlerin retiré de la chambre' });
    } catch (error) {
      next(error);
    }
  }

  async updateHotel(req, res, next) {
    try {
      const { departId } = req.params;
      const { ville, nomHotel } = req.body;
      const data = await this.service.updateHotel(departId, ville, nomHotel);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async autoAssign(req, res, next) {
    try {
      const { departId } = req.params;
      const { ville = 'Makkah' } = req.body;
      const data = await this.service.autoAssign(departId, ville);
      res.status(200).json({
        success: true,
        data,
        message: `${data.assignedCount} pèlerin(s) affecté(s) automatiquement.`,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RoomingController;
