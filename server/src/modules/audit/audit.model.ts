interface IAuditEvent {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type { IAuditEvent };
