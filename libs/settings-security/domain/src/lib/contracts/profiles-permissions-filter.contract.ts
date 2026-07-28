import { ProfilesPermissionsStatus } from '../enums/profiles-permissions-status.enum';

export interface ProfilesPermissionsFilterContract {
    search?: string;
    user?: string;
    status?: ProfilesPermissionsStatus;
}
