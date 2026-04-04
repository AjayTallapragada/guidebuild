import { z } from "zod";

export const createClaimSchema = z.object({
  policyId: z.string().min(1),
  triggerType: z.enum(["weather", "delay", "accident"]),
  reason: z.string().min(5),
  amount: z.number().min(1),
  eventKey: z.string().min(3).optional(),
  proofImageUrl: z.string().url().optional()
});

export const adminClaimDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"])
});
