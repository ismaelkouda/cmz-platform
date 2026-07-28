export interface ProfilesPermissionsUpdateApiDto {
    id: string;
    name: string;
    description: string;
    permissions?: Record<string, string[]>;
}
