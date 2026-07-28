import { Role } from '@cmz/shared-domain';

export interface ParticipantsUpdateValidateContract {
    uniqId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role?: Role;
    team?: string;
}
