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

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const pelada = await peladaService.getById(req.params.id);
      res.status(200).json(pelada);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await peladaService.delete(req.params.id, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async join(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { inviteCode } = req.body;
      if (!inviteCode) {
        return res.status(400).json({ error: 'O código de convite (inviteCode) é obrigatório' });
      }
      const result = await peladaService.join(userId, inviteCode);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async rsvp(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { status, reason } = req.body;
      
      if (!status || !['CONFIRMED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido. Deve ser CONFIRMED ou CANCELLED' });
      }

      const result = await peladaService.rsvp(userId, id, status, reason);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async togglePayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { paid } = req.body;
      
      if (typeof paid !== 'boolean') {
        return res.status(400).json({ error: 'O campo paid deve ser um booleano' });
      }

      const result = await peladaService.togglePayment(userId, id, paid);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizerId = req.user!.userId; // Assumimos que quem bate é o organizador
      const { id, participantId } = req.params;
      const { goals, assists, defenses } = req.body;
      
      const result = await peladaService.updateStats(organizerId, id, participantId, { goals, assists, defenses });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async voteMvp(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { candidateParticipantId } = req.body;

      if (!candidateParticipantId) {
        return res.status(400).json({ error: 'Você precisa enviar o candidato' });
      }

      const result = await peladaService.voteMvp(userId, id, candidateParticipantId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}



