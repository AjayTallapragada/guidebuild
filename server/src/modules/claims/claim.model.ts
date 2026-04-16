export type ClaimStatus = "triggered" | "under_review" | "approved" | "rejected" | "paid";
export type AiRecommendation = "approve_fast" | "review" | "reject";

export interface IClaim {
  userId: string;
  policyId: string;
  eventKey: string;
  proofImageUrl?: string;
  triggerType: "weather" | "delay" | "accident";
  triggerScore: number;
  reason: string;
  amount: number;
  fraudScore: number;
  fraudFlags: string[];
  aiRecommendation: AiRecommendation;
  status: ClaimStatus;
  createdAt: Date;
  updatedAt: Date;
}
