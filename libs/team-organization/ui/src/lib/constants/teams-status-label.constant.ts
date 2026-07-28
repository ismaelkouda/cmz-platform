import { TeamsStatus } from '@cmz/team-organization-domain';

/** Clés i18n des libellés de statut équipe — présentation pure. */
export const TEAMS_STATUS_LABEL: Record<TeamsStatus, string> = {
    [TeamsStatus.ACTIVE]: 'COMMON.ACTIVE',
    [TeamsStatus.INACTIVE]: 'COMMON.INACTIVE',
};
