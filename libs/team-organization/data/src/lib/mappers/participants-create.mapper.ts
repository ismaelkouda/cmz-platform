import { Service, inject } from '@angular/core';
import { ParticipantsCreateValidateContract } from '@cmz/team-organization-domain';
import { RolesMapper } from '@cmz/shared-data';
import { ParticipantsCreateApiDto } from '../dtos/participants-create-api.dto';

/**
 * Exceptionnellement une classe injectable (pas une fonction pure comme
 * les autres mappers de commande du module) : c'est le premier mapper de
 * commande du projet ayant besoin d'une vraie traduction de valeur
 * (`Role` → `RolesDto`, `leader` ↔ `team-leader`) via un service partagé
 * injectable (`RolesMapper`). Fidèle au `ParticipantsCreateMapper` source.
 */
@Service()
export class ParticipantsCreateMapper {
    private readonly rolesMapper = inject(RolesMapper);

    mapEntityToApi(
        contract: ParticipantsCreateValidateContract
    ): ParticipantsCreateApiDto {
        const params = {} as ParticipantsCreateApiDto;
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
