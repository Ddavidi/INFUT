// src/routes/pelada.routes.ts
import { Router } from 'express';
import { PeladaController } from '../controllers/pelada.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { peladaSyncCache } from '../utils/syncCache';
import {
  addGuestSchema,
  batchCheckinSchema,
  createPeladaSchema,
  drawTeamsSchema,
  joinByCodeSchema,
  liveGoalSchema,
  liveMatchupSchema,
  liveTimerSchema,
  recordMatchSchema,
  rsvpSchema,
  setManualTeamsSchema,
  teamPhotoSchema,
  updateCheckinSchema,
  updateGameConfigSchema,
  updatePaymentSchema,
  updatePeladaSchema,
  updatePeladaStatusSchema,
  updateRoleSchema,
  updateStatsSchema,
  updateVotingStatusSchema,
  voteGoalkeeperSchema,
  voteMvpSchema,
} from '../schemas/pelada.schema';

const router = Router();
const peladaController = new PeladaController();

// Qualquer alteracao em /peladas/:id/... apaga a versao em cache dessa pelada assim que
// a resposta sai, para quem esta acompanhando ver a mudanca na proxima consulta.
router.use('/:id', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const id = String(req.params.id);
    res.on('finish', () => peladaSyncCache.invalidate(id));
  }
  next();
});

// Rota publica de visitante (sem login) antes de /:id
router.get('/public/:inviteCode', (req, res, next) => peladaController.getPublicByCode(req, res, next));

router.post('/', authMiddleware, validate(createPeladaSchema), (req, res, next) => peladaController.create(req, res, next));
router.get('/', authMiddleware, (req, res, next) => peladaController.list(req, res, next));
router.get('/explore', authMiddleware, (req, res, next) => peladaController.explore(req, res, next));
router.post('/join-code', authMiddleware, validate(joinByCodeSchema), (req, res, next) => peladaController.joinByCode(req, res, next));

router.get('/:id/sync', authMiddleware, (req, res, next) => peladaController.getSyncVersion(req, res, next));
router.get('/:id', authMiddleware, (req, res, next) => peladaController.getById(req, res, next));
router.put('/:id', authMiddleware, validate(updatePeladaSchema), (req, res, next) => peladaController.update(req, res, next));
router.delete('/:id', authMiddleware, (req, res, next) => peladaController.delete(req, res, next));

router.post('/:id/rsvp', authMiddleware, validate(rsvpSchema), (req, res, next) => peladaController.rsvp(req, res, next));
router.post('/:id/guests', authMiddleware, validate(addGuestSchema), (req, res, next) => peladaController.addGuest(req, res, next));
router.delete('/:id/players/:playerId', authMiddleware, (req, res, next) => peladaController.removePlayer(req, res, next));
router.patch('/:id/players/:playerId/role', authMiddleware, validate(updateRoleSchema), (req, res, next) => peladaController.updatePlayerRole(req, res, next));
router.patch('/:id/players/:playerId/payment', authMiddleware, validate(updatePaymentSchema), (req, res, next) => peladaController.updatePaymentStatus(req, res, next));
router.patch('/:id/players/:playerId/checkin', authMiddleware, validate(updateCheckinSchema), (req, res, next) => peladaController.updateCheckin(req, res, next));
router.post('/:id/checkin-batch', authMiddleware, validate(batchCheckinSchema), (req, res, next) => peladaController.batchCheckin(req, res, next));
router.patch('/:id/players/:playerId/stats', authMiddleware, validate(updateStatsSchema), (req, res, next) => peladaController.updateStats(req, res, next));
router.patch('/:id/game-config', authMiddleware, validate(updateGameConfigSchema), (req, res, next) => peladaController.updateGameConfig(req, res, next));
router.post('/:id/draw-teams', authMiddleware, validate(drawTeamsSchema), (req, res, next) => peladaController.drawTeams(req, res, next));
router.put('/:id/teams', authMiddleware, validate(setManualTeamsSchema), (req, res, next) => peladaController.setManualTeams(req, res, next));
router.patch('/:id/status', authMiddleware, validate(updatePeladaStatusSchema), (req, res, next) => peladaController.updateStatus(req, res, next));
router.patch('/:id/voting-status', authMiddleware, validate(updateVotingStatusSchema), (req, res, next) => peladaController.updateVotingStatus(req, res, next));
router.post('/:id/next-cycle', authMiddleware, (req, res, next) => peladaController.startNextCycle(req, res, next));
router.post('/:id/matches', authMiddleware, validate(recordMatchSchema), (req, res, next) => peladaController.recordMatch(req, res, next));
router.post('/:id/vote-mvp', authMiddleware, validate(voteMvpSchema), (req, res, next) => peladaController.voteMvp(req, res, next));
router.post('/:id/vote-goalkeeper', authMiddleware, validate(voteGoalkeeperSchema), (req, res, next) => peladaController.voteGoalkeeper(req, res, next));

// Sumula ao vivo (placar, gols, cronometro compartilhado) e escudos dos times
router.post('/:id/live/goals', authMiddleware, validate(liveGoalSchema), (req, res, next) => peladaController.addLiveGoal(req, res, next));
router.delete('/:id/live/goals/:eventId', authMiddleware, (req, res, next) => peladaController.removeLiveGoal(req, res, next));
router.put('/:id/live/matchup', authMiddleware, validate(liveMatchupSchema), (req, res, next) => peladaController.setLiveMatchup(req, res, next));
router.post('/:id/live/timer', authMiddleware, validate(liveTimerSchema), (req, res, next) => peladaController.controlLiveTimer(req, res, next));
router.put('/:id/team-photo', authMiddleware, validate(teamPhotoSchema), (req, res, next) => peladaController.setTeamPhoto(req, res, next));

export default router;
