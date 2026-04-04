import { z } from "zod";

export const triggerIngestSchema = z.object({
  policyId: z.string().min(1),
  eventKey: z.string().min(5).optional(),
  triggerType: z.enum(["weather", "delay", "accident"]),
  severity: z.number().min(0).max(1),
  delayMinutes: z.number().min(0).optional(),
  weatherRiskIndex: z.number().min(0).max(1).optional(),
  collisionDetected: z.boolean().optional(),
  proofImageUrl: z.string().url().optional()
});

export const triggerEvaluateSchema = z.object({
  scope: z.string().min(2).default("global")
});
