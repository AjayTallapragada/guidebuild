import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import * as helmetModule from "helmet";
import * as rateLimitModule from "express-rate-limit";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";

export const app = express();

const helmet = ("default" in helmetModule ? helmetModule.default : helmetModule) as unknown as typeof import("helmet").default;
const rateLimit = ("default" in rateLimitModule ? rateLimitModule.default : rateLimitModule) as unknown as typeof import("express-rate-limit").default;

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return value.trim();
  }
}

const allowedOrigins = env.CLIENT_ORIGIN.split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients and same-origin requests without Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.includes(origin));
    },
    credentials: true
  })
);
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1", apiRouter);

app.use(notFound);
app.use(errorHandler);
