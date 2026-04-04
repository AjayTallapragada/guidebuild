import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError.js";

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError("Route not found", 404));
}

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  void next;
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ message: err.message });
    return;
  }

  res.status(500).json({ message: "Internal server error" });
}
