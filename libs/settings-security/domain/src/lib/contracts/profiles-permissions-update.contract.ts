export interface ProfilesPermissionsUpdateContract {
    uniqId?: string;
    name?: string;
    description?: string;
    permissions?: Record<string, string[]>;
}
