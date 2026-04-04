import { Request, Response } from "express";
import { triggerService } from "./trigger.service.js";

export class TriggerController {
  async ingest(req: Request, res: Response) {
    const result = await triggerService.ingest(req.auth!.userId, req.body);
    res.status(201).json(result);
  }
}

export const triggerController = new TriggerController();
