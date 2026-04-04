import { getDb } from "../../config/db.js";

export async function writeAuditEvent(input: {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.execute(
    "INSERT INTO audit_events (user_id, action, resource_type, resource_id, metadata) VALUES (?, ?, ?, ?, ?)",
    [input.userId ?? null, input.action, input.resourceType, input.resourceId, JSON.stringify(input.metadata ?? {})]
  );
}
