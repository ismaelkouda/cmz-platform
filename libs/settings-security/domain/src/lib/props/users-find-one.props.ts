import { Role } from '@cmz/shared-domain';

export interface UsersFindOneProps {
    uniqId: string;
    lastName: string;
    firstName: string;
    email: string;
    phone: string;
    profile: string;
    role: Role | null;
    updatedAt: string;
}
