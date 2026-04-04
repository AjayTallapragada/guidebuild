import { Request, Response } from "express";
import { claimService } from "./claim.service.js";

export class ClaimController {
  async subscriptionStatus(req: Request, res: Response) {
    const status = await claimService.getSubscriptionStatus(req.auth!.userId);
    res.json(status);
  }

  async create(req: Request, res: Response) {
    const claim = await claimService.createByUser(req.auth!.userId, req.body);
    res.status(201).json(claim);
  }

  async list(req: Request, res: Response) {
    const claims = await claimService.list(req.auth!.userId, req.auth!.role);
    res.json(claims);
  }

  async get(req: Request, res: Response) {
    const claim = await claimService.getById(req.auth!.userId, req.auth!.role, String(req.params.claimId));
    res.json(claim);
  }

  async paycheck(req: Request, res: Response) {
    const result = await claimService.requestPaycheck(req.auth!.userId, String(req.params.claimId));
    res.json(result);
  }

  async adminDecision(req: Request, res: Response) {
    const claim = await claimService.adminDecision(req.auth!.userId, String(req.params.claimId), req.body.status);
    res.json(claim);
  }

  async clear(req: Request, res: Response) {
    const result = await claimService.clearByAdmin(req.auth!.userId, String(req.params.claimId));
    res.json(result);
  }
}

export const claimController = new ClaimController();
