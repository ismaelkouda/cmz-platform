import { Role } from '@cmz/shared-domain';
import { ParticipantsStatus } from '../enums/participants-status.enum';

export interface ParticipantsProps {
    uniqId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: Role | null;
    /**
     * Porte le **nom** de l'équipe (fidèle au mapper source :
     * `dto.team?.uniq_id ? dto.team?.name : null`). Diverge délibérément
     * du champ `team` du `find-one` (qui porte l'uniqId) — cf.
     * `ParticipantsFindOneProps`.
     */
    team: string | null;
    status: ParticipantsStatus;
    updatedAt: string;
}
