export interface IUser {
  email: string;
  passwordHash: string;
  fullName: string;
  role: "worker" | "admin";
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}
