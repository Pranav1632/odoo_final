import { prisma } from './prisma';

interface AuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown> | string;
}

/**
 * Writes an audit log entry to the AuditLog table.
 * Person A owns this implementation.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  const details =
    input.details !== undefined
      ? typeof input.details === 'string'
        ? input.details
        : JSON.stringify(input.details)
      : undefined;

  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details,
    },
  });
}
