import { AccessLogsAction } from '@cmz/settings-security-domain';

/** Pas de `dropdownActions`/`actionsRef` : lecture seule, aucune action de ligne. */
export interface AccessLogsVmProps {
    uniqId: string;
    action: AccessLogsAction;
    actionLabel: string;
    source: string;
    userAgent: string;
    createdAt: string;
}
