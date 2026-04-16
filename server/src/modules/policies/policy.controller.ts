import { Request, Response } from "express";
import { policyService } from "./policy.service.js";

export class PolicyController {
  async catalog(_req: Request, res: Response) {
    const result = policyService.getCatalog();
    res.json(result);
  }

  async listMine(req: Request, res: Response) {
    const result = await policyService.listMine(req.auth!.userId);
    res.json(result);
  }

  async buyCatalogPolicy(req: Request, res: Response) {
    const result = await policyService.buyFromCatalog(req.auth!.userId, {
      code: String(req.params.policyCode),
      region: req.body.region,
      vehicleType: req.body.vehicleType
    });
    res.status(201).json(result);
  }

  async subscriptionStatus(req: Request, res: Response) {
    const result = await policyService.getSubscriptionStatus(req.auth!.userId);
    res.json(result);
  }

  async create(req: Request, res: Response) {
    const result = await policyService.create(req.auth!.userId, req.body);
    res.status(201).json(result);
  }

  async list(req: Request, res: Response) {
    const result = await policyService.listAll();
    res.json(result);
  }

  async get(req: Request, res: Response) {
    const result = await policyService.getById(req.auth!.userId, String(req.params.policyId));
    res.json(result);
  }

  async update(req: Request, res: Response) {
    const result = await policyService.update(req.auth!.userId, String(req.params.policyId), req.body);
    res.json(result);
  }

  async cancel(req: Request, res: Response) {
    const result =
      req.auth!.role === "admin"
        ? await policyService.cancelByAdmin(String(req.params.policyId))
        : await policyService.cancel(req.auth!.userId, String(req.params.policyId));
    res.json(result);
  }
}

export const policyController = new PolicyController();
