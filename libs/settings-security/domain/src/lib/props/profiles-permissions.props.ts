import { ProfilesPermissionsStatus } from '../enums/profiles-permissions-status.enum';

export interface ProfilesPermissionsProps {
    uniqId: string;
    name: string;
    slug: string;
    description: string;
    usersCount: number;
    status: ProfilesPermissionsStatus;
    createdAt: string;
    updatedAt: string;
}
