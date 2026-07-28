import { Service } from '@angular/core';
import {
    ProfilesPermissionsFilterContract,
    ProfilesPermissionsStatus,
} from '@cmz/settings-security-domain';
import { ProfilesPermissionsFilterApiDto } from '../dtos/profiles-permissions-filter-api.dto';

@Service()
export class ProfilesPermissionsFilterMapper {
    mapContractToApi(
        contract: ProfilesPermissionsFilterContract
    ): ProfilesPermissionsFilterApiDto {
        const params: ProfilesPermissionsFilterApiDto = {};
        if (contract.search) {
            params.search = contract.search;
        }
        if (contract.user) {
            params.user = contract.user;
        }
        if (contract.status !== undefined) {
            params.is_active =
                contract.status === ProfilesPermissionsStatus.ACTIVE;
        }
        return params;
    }
}
