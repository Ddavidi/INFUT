// src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { changePasswordSchema, updateProfileSchema } from '../schemas/user.schema';

const router = Router();
const userController = new UserController();

router.get('/me', authMiddleware, (req, res, next) => userController.getProfile(req, res, next));
router.get('/ranking', authMiddleware, (req, res, next) => userController.getRanking(req, res, next));
router.put('/me', authMiddleware, validate(updateProfileSchema), (req, res, next) => userController.updateProfile(req, res, next));
router.put('/me/password', authMiddleware, validate(changePasswordSchema), (req, res, next) => userController.changePassword(req, res, next));
router.delete('/me', authMiddleware, (req, res, next) => userController.deleteAccount(req, res, next));

export default router;
