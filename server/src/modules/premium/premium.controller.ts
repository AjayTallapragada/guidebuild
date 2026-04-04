import { Request, Response } from "express";
import { premiumService } from "./premium.service.js";

export class PremiumController {
  quote(req: Request, res: Response) {
    const result = premiumService.quote(req.body);
    res.json(result);
  }
}

export const premiumController = new PremiumController();
