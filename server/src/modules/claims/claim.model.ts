export type ClaimStatus = "triggered" | "under_review" | "approved" | "rejected" | "paid";

export interface IClaim {
  userId: string;
  policyId: string;
  eventKey: string;
  proofImageUrl?: string;
  triggerType: "weather" | "delay" | "accident";
  triggerScore: number;
  reason: string;
  amount: number;
  status: ClaimStatus;
  createdAt: Date;
  updatedAt: Date;
}
