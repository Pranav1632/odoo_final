import { prisma } from './prisma';

export type AuditAction =
  | 'LOGIN'
  | 'CREATE_EMPLOYEE'
  | 'UPDATE_EMPLOYEE'
  | 'DELETE_EMPLOYEE'
  | 'CREATE_CONTRACT'
  | 'UPDATE_CONTRACT'
  | 'DELETE_CONTRACT'
  | 'APPROVE_TIMEOFF'
  | 'REFUSE_TIMEOFF'
  | 'CREATE_TIMEOFF_REQUEST'
  | 'COMPUTE_PAYRUN'
  | 'VALIDATE_PAYRUN'
  | 'MARK_PAID'
  | 'SEND_PAYSLIPS'
  | 'CREATE_PAYRUN'
  | 'UPDATE_SALARY_RULE'
  | 'CREATE_SALARY_RULE'
  | 'DELETE_SALARY_RULE'
  | 'CREATE_SALARY_STRUCTURE'
  | 'UPDATE_SALARY_STRUCTURE'
  | 'DELETE_SALARY_STRUCTURE'
  | 'ATTACH_EMPLOYEES'
  | 'REGISTER'
  | 'APPROVE_USER'
  | 'UPDATE_USER'
  | 'RESET_USER_PASSWORD'
  | 'CHANGE_PASSWORD';


export async function writeAuditLog(params: {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details ? JSON.stringify(params.details) : null,
    },
  });
}
