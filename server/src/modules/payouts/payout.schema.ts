import { z } from "zod";

export const payPayoutSchema = z.object({
  paymentMode: z.enum(["upi", "bank_account", "online_wallet"]),
  paymentHandle: z.string().min(3).max(120).optional()
});
