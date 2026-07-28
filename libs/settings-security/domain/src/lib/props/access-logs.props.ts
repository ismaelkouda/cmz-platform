import { AccessLogsAction } from '../enums/access-logs-action.enum';

/**
 * Journal d'authentification **personnel** (mes connexions/tentatives), pas
 * un audit trail global cross-utilisateurs d'actions CRUD arbitraires —
 * confirmé par la forme du DTO source (pas de champ acteur/cible, juste
 * action + source + user-agent + date). Pas de `updatedAt` : entrées
 * immuables, append-only.
 */
export interface AccessLogsProps {
    uniqId: string;
    action: AccessLogsAction;
    source: string;
    userAgent: string;
    createdAt: string;
}
