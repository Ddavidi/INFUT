// src/routes/pelada.routes.ts
import { Router } from 'express';
import { PeladaController } from '../controllers/pelada.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createPeladaSchema } from '../schemas/pelada.schema';

const router = Router();

const peladaController = new PeladaController();

router.post('/', authMiddleware, validate(createPeladaSchema), (req, res, next) => peladaController.create(req, res, next));
router.post('/join', authMiddleware, (req, res, next) => peladaController.join(req, res, next));
router.get('/', authMiddleware, (req, res, next) => peladaController.list(req, res, next));
router.get('/:id', authMiddleware, (req, res, next) => peladaController.getById(req, res, next));
router.put('/:id/rsvp', authMiddleware, (req, res, next) => peladaController.rsvp(req, res, next));
router.patch('/:id/payment', authMiddleware, (req, res, next) => peladaController.togglePayment(req, res, next));
router.patch('/:id/participants/:participantId/stats', authMiddleware, (req, res, next) => peladaController.updateStats(req, res, next));
router.post('/:id/mvp-vote', authMiddleware, (req, res, next) => peladaController.voteMvp(req, res, next));
router.delete('/:id', authMiddleware, (req, res, next) => peladaController.delete(req, res, next));

export default router;
