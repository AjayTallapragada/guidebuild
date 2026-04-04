export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type UserProfile = {
  _id: string;
  email: string;
  fullName: string;
  role: "worker" | "admin";
};

export type Policy = {
  _id: string;
  name: string;
  policyType: "weather" | "delay" | "accident";
  region: string;
  vehicleType: "bike" | "scooter" | "car";
  coverageLimit: number;
  deductible: number;
  monthlyBasePremium: number;
  status: "active" | "cancelled";
};

export type Claim = {
  _id: string;
  policyId: string;
  proofImageUrl?: string;
  triggerType: "weather" | "delay" | "accident";
  triggerScore: number;
  reason: string;
  amount: number;
  status: "triggered" | "under_review" | "approved" | "rejected" | "paid";
  createdAt: string;
};

export type Payout = {
  _id: string;
  userId?: string;
  claimId: string;
  amount: number;
  status: "queued" | "processed";
  paymentMode?: "upi" | "bank_account" | "online_wallet";
  paymentHandle?: string;
  createdAt: string;
};
