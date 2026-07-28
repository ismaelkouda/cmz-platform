import { Role } from '@cmz/shared-domain';
import { UsersStatus } from '../enums/users-status.enum';

export interface UsersProps {
    uniqId: string;
    lastName: string;
    firstName: string;
    email: string;
    phone: string;
    profile: string;
    role: Role | null;
    status: UsersStatus;
    updatedAt: string;
}
