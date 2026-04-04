export type PolicyType = "weather" | "delay" | "accident";

export interface IPolicy {
  userId: string;
  name: string;
  policyType: PolicyType;
  region: string;
  vehicleType: "bike" | "scooter" | "car";
  coverageLimit: number;
  deductible: number;
  monthlyBasePremium: number;
  status: "active" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}
