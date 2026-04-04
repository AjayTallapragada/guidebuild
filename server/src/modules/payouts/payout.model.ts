export interface IPayout {
  userId: string;
  claimId: string;
  amount: number;
  status: "queued" | "processed";
  createdAt: Date;
  updatedAt: Date;
}
