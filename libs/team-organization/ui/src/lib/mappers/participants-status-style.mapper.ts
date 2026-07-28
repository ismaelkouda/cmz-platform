import { ParticipantsStatus } from '@cmz/team-organization-domain';
import { ParticipantsStatusStyle } from '../enums/participants-status-style.enum';

const MAP: Record<ParticipantsStatus, ParticipantsStatusStyle> = {
    [ParticipantsStatus.ACTIVE]: ParticipantsStatusStyle.ACTIVE,
    [ParticipantsStatus.INACTIVE]: ParticipantsStatusStyle.INACTIVE,
    [ParticipantsStatus.BLOCKED]: ParticipantsStatusStyle.BLOCKED,
    [ParticipantsStatus.PENDING]: ParticipantsStatusStyle.PENDING,
};

/** Traduit un `ParticipantsStatus` (domaine) en style d'affichage — logique UI. */
export function participantsStatusStyleOf(
    status: ParticipantsStatus
): ParticipantsStatusStyle {
    return MAP[status];
}
