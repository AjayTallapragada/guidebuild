import bcrypt from "bcryptjs";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { AppError } from "../../utils/appError.js";
import { getDb } from "../../config/db.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: "worker" | "admin";
  refresh_token: string | null;
  created_at: Date;
};

export class AuthService {
  async register(payload: { fullName: string; email: string; password: string }) {
    const db = getDb();
    const email = payload.email.toLowerCase();
    const [existingRows] = await db.query<UserRow[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existingRows.length > 0) {
      throw new AppError("Email is already registered", 409);
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const [result] = await db.execute<ResultSetHeader>(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'worker')",
      [payload.fullName, email, passwordHash]
    );

    return this.issueTokens(String(result.insertId), email, "worker");
  }

  async login(payload: { email: string; password: string }) {
    const db = getDb();
    const [rows] = await db.query<UserRow[]>("SELECT * FROM users WHERE email = ? LIMIT 1", [
      payload.email.toLowerCase()
    ]);
    const user = rows[0];
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const valid = await bcrypt.compare(payload.password, user.password_hash);
    if (!valid) {
      throw new AppError("Invalid credentials", 401);
    }

    return this.issueTokens(String(user.id), user.email, user.role);
  }

  async refresh(refreshToken: string) {
    const db = getDb();
    const payload = verifyRefreshToken(refreshToken);
    const [rows] = await db.query<UserRow[]>("SELECT * FROM users WHERE id = ? LIMIT 1", [payload.userId]);
    const user = rows[0];
    if (!user || user.refresh_token !== refreshToken) {
      throw new AppError("Refresh token invalid", 401);
    }

    return this.issueTokens(String(user.id), user.email, user.role);
  }

  async logout(userId: string) {
    const db = getDb();
    await db.execute("UPDATE users SET refresh_token = NULL WHERE id = ?", [userId]);
  }

  async getProfile(userId: string) {
    const db = getDb();
    const [rows] = await db.query<UserRow[]>(
      "SELECT id, email, full_name, role, created_at FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    const user = rows[0];
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return {
      _id: String(user.id),
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      createdAt: user.created_at
    };
  }

  private async issueTokens(userId: string, email: string, role: "worker" | "admin") {
    const db = getDb();
    const accessToken = signAccessToken({ userId, email, role });
    const refreshToken = signRefreshToken({ userId, email, role });

    await db.execute("UPDATE users SET refresh_token = ? WHERE id = ?", [refreshToken, userId]);

    return {
      accessToken,
      refreshToken
    };
  }
}

export const authService = new AuthService();
