// src/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

const userService = new UserService();

export class UserController {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await userService.getProfile(userId);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async getRanking(_req: Request, res: Response, next: NextFunction) {
    try {
      const ranking = await userService.getRanking();
      res.status(200).json(ranking);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await userService.updateProfile(userId, req.body);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await userService.deleteAccount(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
