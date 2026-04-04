import { Request, Response } from "express";
import { authService } from "./auth.service.js";

export class AuthController {
  async register(req: Request, res: Response) {
    const tokens = await authService.register(req.body);
    res.status(201).json(tokens);
  }

  async login(req: Request, res: Response) {
    const tokens = await authService.login(req.body);
    res.json(tokens);
  }

  async refresh(req: Request, res: Response) {
    const token = req.body.refreshToken;
    const tokens = await authService.refresh(token);
    res.json(tokens);
  }

  async logout(req: Request, res: Response) {
    await authService.logout(req.auth!.userId);
    res.status(204).send();
  }

  async me(req: Request, res: Response) {
    const profile = await authService.getProfile(req.auth!.userId);
    res.json(profile);
  }
}

export const authController = new AuthController();
