import { Role } from '@cmz/shared-domain';

export interface ParticipantsCreateValidateContract {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role?: Role;
    team?: string;
}
