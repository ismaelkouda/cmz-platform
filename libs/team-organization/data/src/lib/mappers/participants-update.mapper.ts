import { Service, inject } from '@angular/core';
import { ParticipantsUpdateValidateContract } from '@cmz/team-organization-domain';
import { RolesMapper } from '@cmz/shared-data';
import { ParticipantsUpdateApiDto } from '../dtos/participants-update-api.dto';

@Service()
export class ParticipantsUpdateMapper {
    private readonly rolesMapper = inject(RolesMapper);

    mapEntityToApi(
        contract: ParticipantsUpdateValidateContract
    ): ParticipantsUpdateApiDto {
        const params = {} as ParticipantsUpdateApiDto;
        params.id = contract.uniqId;
        params.first_name = contract.firstName;
        params.last_name = contract.lastName;
        params.email = contract.email;
        params.phone_number = contract.phone;
        if (contract.role) {
            params.role = this.rolesMapper.mapToDto(contract.role);
        }
        if (contract.team) {
            params.team_uniq_id = contract.team;
        }
        return params;
    }
}
