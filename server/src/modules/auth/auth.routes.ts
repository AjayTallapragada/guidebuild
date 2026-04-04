import { Router } from "express";
import { authController } from "./auth.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateBody } from "../../middlewares/validate.js";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schema.js";
import { requireAuth } from "../../middlewares/auth.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), asyncHandler((req, res) => authController.register(req, res)));
authRouter.post("/login", validateBody(loginSchema), asyncHandler((req, res) => authController.login(req, res)));
authRouter.post("/refresh", validateBody(refreshSchema), asyncHandler((req, res) => authController.refresh(req, res)));
authRouter.post("/logout", requireAuth, asyncHandler((req, res) => authController.logout(req, res)));
authRouter.get("/me", requireAuth, asyncHandler((req, res) => authController.me(req, res)));
