import { Service, inject } from '@angular/core';
import { ParticipantsFilterContract } from '@cmz/team-organization-domain';
import { RolesMapper } from '@cmz/shared-data';
import { ParticipantsFilterApiDto } from '../dtos/participants-filter-api.dto';

/** Classe (pas une fonction pure) pour la même raison que les mappers create/update : traduction `Role` → `RolesDto`. */
@Service()
export class ParticipantsFilterMapper {
    private readonly rolesMapper = inject(RolesMapper);

    mapContractToApi(
        contract: ParticipantsFilterContract
    ): ParticipantsFilterApiDto {
        const params: ParticipantsFilterApiDto = {};
        if (contract.search) {
            params.search = contract.search;
        }
        if (contract.role) {
            params.role = this.rolesMapper.mapToDto(contract.role);
        }
        if (contract.team) {
            params.team = contract.team;
        }
        if (contract.status) {
            params.status = contract.status;
        }
        return params;
    }
}
