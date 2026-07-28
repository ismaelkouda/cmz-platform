import { RolesDto } from '@cmz/shared-data';

export interface UsersFilterApiDto {
    search?: string;
    profile?: string;
    role?: RolesDto;
    is_active?: boolean;
}
