import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { dashboardController } from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get("/summary", asyncHandler((req, res) => dashboardController.summary(req, res)));
