import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { policyRouter } from "../modules/policies/policy.routes.js";
import { premiumRouter } from "../modules/premium/premium.routes.js";
import { triggerRouter } from "../modules/triggers/trigger.routes.js";
import { claimRouter } from "../modules/claims/claim.routes.js";
import { payoutRouter } from "../modules/payouts/payout.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/policies", policyRouter);
apiRouter.use("/premium", premiumRouter);
apiRouter.use("/triggers", triggerRouter);
apiRouter.use("/claims", claimRouter);
apiRouter.use("/payouts", payoutRouter);
