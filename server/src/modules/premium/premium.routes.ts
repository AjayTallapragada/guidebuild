import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { premiumQuoteSchema } from "./premium.schema.js";
import { premiumController } from "./premium.controller.js";

export const premiumRouter = Router();

premiumRouter.use(requireAuth);
premiumRouter.post("/quote", validateBody(premiumQuoteSchema), (req, res) => premiumController.quote(req, res));
