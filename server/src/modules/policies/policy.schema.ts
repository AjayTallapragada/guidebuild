import { z } from "zod";

export const createPolicySchema = z.object({
  name: z.string().min(2),
  policyType: z.enum(["weather", "delay"]),
  region: z.string().min(2),
  vehicleType: z.enum(["bike", "scooter"]),
  coverageLimit: z.number().min(100),
  deductible: z.number().min(0).max(1000),
  monthlyBasePremium: z.number().min(1)
});

export const updatePolicySchema = createPolicySchema.partial();

export const buyCatalogPolicySchema = z.object({
  region: z.string().min(2),
  vehicleType: z.enum(["bike", "scooter"])
});
