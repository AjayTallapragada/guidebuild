import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/appError.js";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      userId: string;
      email: string;
      role: "worker" | "admin";
    };
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Missing bearer token", 401);
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyAccessToken(token);
  req.auth = payload;
  next();
}
