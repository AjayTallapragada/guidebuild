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
  userId?: string;
  policyId: string;
  proofImageUrl?: string;
  triggerType: "weather" | "delay" | "accident";
  triggerScore: number;
  reason: string;
  amount: number;
  fraudScore: number;
  fraudFlags: string[];
  aiRecommendation: "approve_fast" | "review" | "reject";
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
  gateway?: "razorpay_test" | "stripe_sandbox" | "upi_simulator";
  gatewayReference?: string;
  etaMinutes?: number;
  createdAt: string;
};

export type WorkerDashboardSummary = {
  role: "worker";
  earningsProtected: number;
  activeWeeklyCoverage: number;
  queuedPayouts: number;
  processedPayouts: number;
  instantApprovals: number;
  reviewClaims: number;
  activePolicies: Array<{
    name: string;
    policyType: "weather" | "delay" | "accident";
    region: string;
    weeklyPremium: number;
    coverageLimit: number;
  }>;
  recentClaims: Array<{
    id: string;
    triggerType: "weather" | "delay" | "accident";
    amount: number;
    status: Claim["status"];
    fraudScore: number;
    aiRecommendation: Claim["aiRecommendation"];
    createdAt: string;
  }>;
};

export type AdminDashboardSummary = {
  role: "admin";
  totalPremiums: number;
  approvedAmount: number;
  paidAmount: number;
  openClaims: number;
  totalClaims: number;
  rejectedClaims: number;
  flaggedClaims: number;
  lossRatio: number;
  triggerMix: Array<{
    triggerType: "weather" | "delay" | "accident";
    claimCount: number;
    amount: number;
  }>;
  sevenDayTrend: Array<{
    bucket: string;
    claimCount: number;
    avgFraud: number;
    paidAmount: number;
  }>;
  nextWeekPrediction: {
    likelyClaims: number;
    dominantTrigger: "weather" | "delay" | "accident";
    projectedLossRatio: number;
    projectedPaidAmount: number;
    recommendation: string;
  };
};

export type DashboardSummary = WorkerDashboardSummary | AdminDashboardSummary;
