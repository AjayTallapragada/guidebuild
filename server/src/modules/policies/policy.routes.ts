import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { policyController } from "./policy.controller.js";
import { buyCatalogPolicySchema, createPolicySchema, updatePolicySchema } from "./policy.schema.js";
import { requireRole } from "../../middlewares/rbac.js";

export const policyRouter = Router();

policyRouter.use(requireAuth);
policyRouter.get("/catalog", requireRole("worker", "admin"), asyncHandler((req, res) => policyController.catalog(req, res)));
policyRouter.get("/mine", requireRole("worker"), asyncHandler((req, res) => policyController.listMine(req, res)));
policyRouter.post("/catalog/:policyCode/buy", requireRole("worker"), validateBody(buyCatalogPolicySchema), asyncHandler((req, res) => policyController.buyCatalogPolicy(req, res)));
policyRouter.get("/subscription/status", requireRole("worker"), asyncHandler((req, res) => policyController.subscriptionStatus(req, res)));
policyRouter.get("/", requireRole("admin"), asyncHandler((req, res) => policyController.list(req, res)));
policyRouter.post("/", requireRole("admin"), validateBody(createPolicySchema), asyncHandler((req, res) => policyController.create(req, res)));
policyRouter.get("/:policyId", requireRole("admin"), asyncHandler((req, res) => policyController.get(req, res)));
policyRouter.patch("/:policyId", requireRole("admin"), validateBody(updatePolicySchema), asyncHandler((req, res) => policyController.update(req, res)));
policyRouter.post("/:policyId/cancel", requireRole("worker", "admin"), asyncHandler((req, res) => policyController.cancel(req, res)));
