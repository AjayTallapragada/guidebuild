import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";

type UserRole = "worker" | "admin";

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role) {
      throw new AppError("Missing auth role", 401);
    }

    if (!allowedRoles.includes(role)) {
      throw new AppError("Forbidden", 403);
    }

    next();
  };
}
