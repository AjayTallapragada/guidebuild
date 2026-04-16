import { AppError } from "../../utils/appError.js";
import { getDb } from "../../config/db.js";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { writeAuditEvent } from "../audit/audit.service.js";

type PolicyRow = RowDataPacket & {
  id: number;
  user_id: number;
  name: string;
  policy_type: "weather" | "delay" | "accident";
  region: string;
  vehicle_type: "bike" | "scooter" | "car";
  coverage_limit: number;
  deductible: number;
  monthly_base_premium: number;
  status: "active" | "cancelled";
  created_at: Date;
  updated_at: Date;
};

function mapPolicy(row: PolicyRow) {
  return {
    _id: String(row.id),
    userId: String(row.user_id),
    name: row.name,
    policyType: row.policy_type,
    region: row.region,
    vehicleType: row.vehicle_type,
    coverageLimit: Number(row.coverage_limit),
    deductible: Number(row.deductible),
    monthlyBasePremium: Number(row.monthly_base_premium),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export type PrepaidPolicyCatalogItem = {
  code: string;
  name: string;
  occasion: string;
  description: string;
  policyType: "weather" | "delay" | "accident";
  coverageLimit: number;
  deductible: number;
  monthlyBasePremium: number;
};

const prepaidPolicyCatalog: PrepaidPolicyCatalogItem[] = [
  {
    code: "SURGE_GUARD",
    name: "Surge Guard",
    occasion: "High demand surge windows",
    description: "Covers income shocks during peak-demand and delayed completion windows.",
    policyType: "delay",
    coverageLimit: 1800,
    deductible: 120,
    monthlyBasePremium: 29
  },
  {
    code: "ACCIDENT_SHIELD",
    name: "Accident Shield",
    occasion: "Road incidents and delivery accidents",
    description: "Protection for delivery accidents and related downtime impact.",
    policyType: "accident",
    coverageLimit: 3200,
    deductible: 180,
    monthlyBasePremium: 36
  },
  {
    code: "STORM_RUNNER",
    name: "Storm Runner",
    occasion: "Heavy rain, storms, and poor visibility",
    description: "Weather-triggered cover during adverse forecast and alert periods.",
    policyType: "weather",
    coverageLimit: 2400,
    deductible: 140,
    monthlyBasePremium: 31
  },
  {
    code: "FESTIVE_RUSH",
    name: "Festive Rush",
    occasion: "Holiday and festival traffic spikes",
    description: "Special prepaid protection for high-volume festive delivery cycles.",
    policyType: "delay",
    coverageLimit: 2100,
    deductible: 130,
    monthlyBasePremium: 33
  },
  {
    code: "NIGHT_SHIFT_PLUS",
    name: "Night Shift Plus",
    occasion: "Late-night and high-risk zone deliveries",
    description: "Additional cover for late-hour delivery operations.",
    policyType: "accident",
    coverageLimit: 2600,
    deductible: 160,
    monthlyBasePremium: 34
  }
];

export class PolicyService {
  getCatalog() {
    return prepaidPolicyCatalog;
  }

  async listMine(userId: string) {
    return this.list(userId);
  }

  async buyFromCatalog(
    userId: string,
    input: { code: string; region: string; vehicleType: "bike" | "scooter" | "car" }
  ) {
    const item = prepaidPolicyCatalog.find((catalogItem) => catalogItem.code === input.code);
    if (!item) {
      throw new AppError("Catalog policy not found", 404);
    }

    const policy = await this.create(userId, {
      name: `${item.name} (${item.occasion})`,
      policyType: item.policyType,
      region: input.region,
      vehicleType: input.vehicleType,
      coverageLimit: item.coverageLimit,
      deductible: item.deductible,
      monthlyBasePremium: item.monthlyBasePremium
    });

    await writeAuditEvent({
      userId,
      action: "policy.catalog.purchased",
      resourceType: "policy",
      resourceId: policy._id,
      metadata: { code: item.code, region: input.region, vehicleType: input.vehicleType }
    });

    return policy;
  }

  async create(userId: string, payload: any) {
    const db = getDb();
    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO policies (user_id, name, policy_type, region, vehicle_type, coverage_limit, deductible, monthly_base_premium, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        userId,
        payload.name,
        payload.policyType,
        payload.region,
        payload.vehicleType,
        payload.coverageLimit,
        payload.deductible,
        payload.monthlyBasePremium
      ]
    );
    return this.getById(userId, String(result.insertId));
  }

  async list(userId: string) {
    const db = getDb();
    const [rows] = await db.query<PolicyRow[]>("SELECT * FROM policies WHERE user_id = ? ORDER BY created_at DESC", [
      userId
    ]);
    return rows.map(mapPolicy);
  }

  async listAll() {
    const db = getDb();
    const [rows] = await db.query<PolicyRow[]>("SELECT * FROM policies ORDER BY created_at DESC");
    return rows.map(mapPolicy);
  }

  async getById(userId: string, policyId: string) {
    const db = getDb();
    const [rows] = await db.query<PolicyRow[]>("SELECT * FROM policies WHERE id = ? AND user_id = ? LIMIT 1", [
      policyId,
      userId
    ]);
    if (rows.length === 0) {
      throw new AppError("Policy not found", 404);
    }
    return mapPolicy(rows[0]);
  }

  async update(userId: string, policyId: string, payload: any) {
    const db = getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    const keyMap: Record<string, string> = {
      name: "name",
      policyType: "policy_type",
      region: "region",
      vehicleType: "vehicle_type",
      coverageLimit: "coverage_limit",
      deductible: "deductible",
      monthlyBasePremium: "monthly_base_premium",
      status: "status"
    };

    for (const [key, dbKey] of Object.entries(keyMap)) {
      if (payload[key] !== undefined) {
        fields.push(`${dbKey} = ?`);
        values.push(payload[key]);
      }
    }

    if (fields.length > 0) {
      values.push(policyId, userId);
      const [result] = await db.query<ResultSetHeader>(
        `UPDATE policies SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
        values as any[]
      );
      if (result.affectedRows === 0) {
        throw new AppError("Policy not found", 404);
      }
    }
    return this.getById(userId, policyId);
  }

  async cancel(userId: string, policyId: string) {
    const db = getDb();
    const [result] = await db.execute<ResultSetHeader>(
      "UPDATE policies SET status = 'cancelled' WHERE id = ? AND user_id = ?",
      [policyId, userId]
    );
    if (result.affectedRows === 0) {
      throw new AppError("Policy not found", 404);
    }
    return this.getById(userId, policyId);
  }

  async cancelByAdmin(policyId: string) {
    const db = getDb();
    const [result] = await db.execute<ResultSetHeader>(
      "UPDATE policies SET status = 'cancelled' WHERE id = ?",
      [policyId]
    );
    if (result.affectedRows === 0) {
      throw new AppError("Policy not found", 404);
    }
    const [rows] = await db.query<PolicyRow[]>("SELECT * FROM policies WHERE id = ? LIMIT 1", [policyId]);
    return mapPolicy(rows[0]);
  }

  async getSubscriptionStatus(userId: string) {
    const db = getDb();
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS activeCount FROM policies WHERE user_id = ? AND status = 'active'",
      [userId]
    );
    const activeCount = Number(rows[0]?.activeCount ?? 0);
    return {
      hasActiveSubscription: activeCount > 0,
      activeCount
    };
  }
}

export const policyService = new PolicyService();
