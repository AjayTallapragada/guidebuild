import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { payoutController } from "./payout.controller.js";
import { validateBody } from "../../middlewares/validate.js";
import { payPayoutSchema } from "./payout.schema.js";

export const payoutRouter = Router();

payoutRouter.use(requireAuth);
payoutRouter.get("/", asyncHandler((req, res) => payoutController.list(req, res)));
payoutRouter.get("/:payoutId", asyncHandler((req, res) => payoutController.get(req, res)));
payoutRouter.post("/process", asyncHandler((req, res) => payoutController.process(req, res)));
payoutRouter.post("/:payoutId/pay", validateBody(payPayoutSchema), asyncHandler((req, res) => payoutController.pay(req, res)));
