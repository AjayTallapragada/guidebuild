import { Request, Response } from "express";
import { payoutService } from "./payout.service.js";

export class PayoutController {
  async list(req: Request, res: Response) {
    const payouts = await payoutService.list(req.auth!.userId, req.auth!.role);
    res.json(payouts);
  }

  async get(req: Request, res: Response) {
    const payout = await payoutService.getById(req.auth!.userId, String(req.params.payoutId));
    res.json(payout);
  }

  async process(req: Request, res: Response) {
    const result = await payoutService.processQueuedPayouts();
    res.json(result);
  }

  async pay(req: Request, res: Response) {
    const payout = await payoutService.payByMode(req.auth!.userId, String(req.params.payoutId), req.body);
    res.json(payout);
  }
}

export const payoutController = new PayoutController();
