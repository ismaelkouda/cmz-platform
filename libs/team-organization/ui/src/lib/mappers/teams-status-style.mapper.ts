import { TeamsStatus } from '@cmz/team-organization-domain';
import { TeamsStatusStyle } from '../enums/teams-status-style.enum';

/** Traduit un `TeamsStatus` (domaine) en style d'affichage — logique UI. */
export function teamsStatusStyleOf(status: TeamsStatus): TeamsStatusStyle {
    return status === TeamsStatus.ACTIVE
        ? TeamsStatusStyle.ACTIVE
        : TeamsStatusStyle.INACTIVE;
}
