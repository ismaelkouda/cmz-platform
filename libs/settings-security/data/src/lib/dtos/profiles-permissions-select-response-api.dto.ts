import { SimpleResponseDto } from '@cmz/shared-data';

export interface ProfilesPermissionsSelectItemApiDto {
    uniq_id: string;
    name: string;
}

export type ProfilesPermissionsSelectResponseApiDto = SimpleResponseDto<
    ProfilesPermissionsSelectItemApiDto[]
>;
