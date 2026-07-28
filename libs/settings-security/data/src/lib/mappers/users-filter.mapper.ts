import { Service, inject } from '@angular/core';
import {
    UsersFilterContract,
    UsersStatus,
} from '@cmz/settings-security-domain';
import { RolesMapper } from '@cmz/shared-data';
import { UsersFilterApiDto } from '../dtos/users-filter-api.dto';

/** Classe (pas fonction pure) : traduction `Role` -> `RolesDto`, même raison que `team-organization/participants-filter.mapper.ts`. */
@Service()
export class UsersFilterMapper {
    private readonly rolesMapper = inject(RolesMapper);

    mapContractToApi(contract: UsersFilterContract): UsersFilterApiDto {
        const params: UsersFilterApiDto = {};
        if (contract.search) {
            params.search = contract.search;
        }
        if (contract.profile) {
            params.profile = contract.profile;
        }
        if (contract.role) {
            params.role = this.rolesMapper.mapToDto(contract.role);
        }
        if (contract.status !== undefined) {
            params.is_active = contract.status === UsersStatus.ACTIVE;
        }
        return params;
    }
}
