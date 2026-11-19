// src/controllers/pelada.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PeladaService } from '../services/pelada.service';

const peladaService = new PeladaService();

export class PeladaController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const organizerId = req.user!.userId;
      const pelada = await peladaService.create(organizerId, req.body);
      res.status(201).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const peladas = await peladaService.list(userId);
      res.status(200).json(peladas);
    } catch (error) {
      next(error);
    }
  }

  async explore(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const sport = req.query.sport ? String(req.query.sport) : undefined;
      const region = req.query.region ? String(req.query.region) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const peladas = await peladaService.explore(userId, { sport, region, search });
      res.status(200).json(peladas);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.getById(String(req.params.id), userId);
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async getPublicByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const pelada = await peladaService.getPublicByInviteCode(String(req.params.inviteCode));
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.update(String(req.params.id), userId, req.body);
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await peladaService.delete(String(req.params.id), userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async joinByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.joinByCode(userId, req.body.inviteCode);
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async rsvp(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.rsvp(String(req.params.id), userId, req.body);
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async addGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.addGuest(String(req.params.id), userId, req.body);
      res.status(201).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async removePlayer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.removePlayer(
        String(req.params.id),
        userId,
        String(req.params.playerId)
      );
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async updatePlayerRole(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.updatePlayerRole(
        String(req.params.id),
        userId,
        String(req.params.playerId),
        req.body.role
      );
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async updatePaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.updatePaymentStatus(
        String(req.params.id),
        userId,
        String(req.params.playerId),
        req.body.paymentStatus
      );
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async updateStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.updateStats(
        String(req.params.id),
        userId,
        String(req.params.playerId),
        req.body
      );
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async voteMvp(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.voteMvp(
        String(req.params.id),
        userId,
        req.body.targetPlayerId
      );
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async voteGoalkeeper(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.voteGoalkeeper(
        String(req.params.id),
        userId,
        req.body.targetPlayerId
      );
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async updateCheckin(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.updateCheckin(
        String(req.params.id),
        userId,
        String(req.params.playerId),
        req.body
      );
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async recordMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.recordMatch(
        String(req.params.id),
        userId,
        req.body
      );
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async drawTeams(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.drawTeams(
        String(req.params.id),
        userId,
        req.body
      );
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async setManualTeams(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.setManualTeams(
        String(req.params.id),
        userId,
        req.body
      );
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.updateStatus(
        String(req.params.id),
        userId,
        req.body
      );
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async startNextCycle(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const pelada = await peladaService.startNextCycle(
        String(req.params.id),
        userId
      );
      res.status(201).json(pelada);
    } catch (error) {
      next(error);
    }
  }
}
