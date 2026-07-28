export interface ProfilesPermissionsUpdateValidateContract {
    uniqId: string;
    name: string;
    description: string;
    permissions?: Record<string, string[]>;
}
