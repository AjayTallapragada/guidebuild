import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { claimController } from "./claim.controller.js";
import { validateBody } from "../../middlewares/validate.js";
import { adminClaimDecisionSchema, createClaimSchema } from "./claim.schema.js";
import { requireRole } from "../../middlewares/rbac.js";

export const claimRouter = Router();

claimRouter.use(requireAuth);
claimRouter.get("/subscription/status", requireRole("worker"), asyncHandler((req, res) => claimController.subscriptionStatus(req, res)));
claimRouter.post("/", requireRole("worker"), validateBody(createClaimSchema), asyncHandler((req, res) => claimController.create(req, res)));
claimRouter.get("/", asyncHandler((req, res) => claimController.list(req, res)));
claimRouter.get("/:claimId", asyncHandler((req, res) => claimController.get(req, res)));
claimRouter.post("/:claimId/paycheck", requireRole("worker"), asyncHandler((req, res) => claimController.paycheck(req, res)));
claimRouter.patch("/:claimId/status", requireRole("admin"), validateBody(adminClaimDecisionSchema), asyncHandler((req, res) => claimController.adminDecision(req, res)));
claimRouter.delete("/:claimId", requireRole("admin"), asyncHandler((req, res) => claimController.clear(req, res)));
