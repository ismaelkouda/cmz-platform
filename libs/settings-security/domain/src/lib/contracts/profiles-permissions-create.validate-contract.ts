export interface ProfilesPermissionsCreateValidateContract {
    name: string;
    description: string;
    permissions?: Record<string, string[]>;
}
