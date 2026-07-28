export interface ProfilesPermissionsCreateContract {
    name?: string;
    description?: string;
    permissions?: Record<string, string[]>;
}
