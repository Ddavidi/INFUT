// src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateProfileSchema } from '../schemas/user.schema';

const router = Router();
const userController = new UserController();

router.get('/me', authMiddleware, (req, res, next) => userController.getProfile(req, res, next));
router.put('/me', authMiddleware, validate(updateProfileSchema), (req, res, next) => userController.updateProfile(req, res, next));

export default router;
