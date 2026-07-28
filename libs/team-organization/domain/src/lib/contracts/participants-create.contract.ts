import { Role } from '@cmz/shared-domain';

export interface ParticipantsCreateContract {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: Role;
    team?: string;
}
