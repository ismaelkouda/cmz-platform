import { ParticipantsStatus } from '@cmz/team-organization-domain';

/** Clés i18n des libellés de statut participant — présentation pure. */
export const PARTICIPANTS_STATUS_LABEL: Record<ParticipantsStatus, string> = {
    [ParticipantsStatus.ACTIVE]: 'COMMON.ACTIVE',
    [ParticipantsStatus.INACTIVE]: 'COMMON.INACTIVE',
    [ParticipantsStatus.BLOCKED]: 'COMMON.BLOCKED',
    [ParticipantsStatus.PENDING]: 'COMMON.PENDING',
};
