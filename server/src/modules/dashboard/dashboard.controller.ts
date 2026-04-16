import { Request, Response } from "express";
import { dashboardService } from "./dashboard.service.js";

export class DashboardController {
  async summary(req: Request, res: Response) {
    if (req.auth!.role === "admin") {
      const summary = await dashboardService.adminSummary();
      res.json({ role: "admin", ...summary });
      return;
    }

    const summary = await dashboardService.workerSummary(req.auth!.userId);
    res.json({ role: "worker", ...summary });
  }
}

export const dashboardController = new DashboardController();
