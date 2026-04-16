import { z } from "zod";

export const triggerIngestSchema = z.object({
  policyId: z.string().min(1),
  eventKey: z.string().min(5).optional(),
  triggerType: z.enum(["weather", "delay"]),
  severity: z.number().min(0).max(1),
  scope: z.string().min(2).optional(),
  delayMinutes: z.number().min(0).optional(),
  weatherRiskIndex: z.number().min(0).max(1).optional(),
  gpsDriftMeters: z.number().min(0).max(5000).optional(),
  travelSpeedKph: z.number().min(0).max(200).optional(),
  proofImageUrl: z.string().url().optional()
});

export const triggerEvaluateSchema = z.object({
  scope: z.string().min(2).default("global")
});
