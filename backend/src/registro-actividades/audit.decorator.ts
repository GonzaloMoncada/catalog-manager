import { SetMetadata } from '@nestjs/common';

export const AUDIT_TABLE_KEY = 'auditTable';
export const AuditTable = (nombreTabla: string) => SetMetadata(AUDIT_TABLE_KEY, nombreTabla);

export const SKIP_AUDIT_KEY = 'skipAudit';
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
