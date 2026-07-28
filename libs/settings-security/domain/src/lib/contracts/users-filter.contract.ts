import { Role } from '@cmz/shared-domain';
import { UsersStatus } from '../enums/users-status.enum';

export interface UsersFilterContract {
    search?: string;
    profile?: string;
    role?: Role;
    status?: UsersStatus;
}
