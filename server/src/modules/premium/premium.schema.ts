import { z } from "zod";

export const premiumQuoteSchema = z.object({
  policyType: z.enum(["weather", "delay", "accident"]),
  regionRiskIndex: z.number().min(0).max(1),
  weatherRiskIndex: z.number().min(0).max(1),
  claimHistoryRate: z.number().min(0).max(1),
  weeklyHours: z.number().min(1).max(80),
  coverageLimit: z.number().min(100),
  deductible: z.number().min(0).max(1000)
});
