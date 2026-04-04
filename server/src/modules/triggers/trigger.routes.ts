import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { triggerIngestSchema } from "./trigger.schema.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { triggerController } from "./trigger.controller.js";

export const triggerRouter = Router();

triggerRouter.use(requireAuth);
triggerRouter.post("/ingest", validateBody(triggerIngestSchema), asyncHandler((req, res) => triggerController.ingest(req, res)));
