import { Service } from '@angular/core';
import { Roles } from '@cmz/shared-domain';
import { RolesDto } from '../dtos/roles.dto';

@Service()
export class RolesMapper {
    private readonly dtoToEnum: Record<RolesDto, Roles> = {
        [RolesDto.SUPERVISOR]: Roles.SUPERVISOR,
        [RolesDto['TEAM-LEADER']]: Roles['TEAM-LEADER'],
        [RolesDto.AGENT]: Roles.AGENT,
    };

    private readonly enumToDto: Record<Roles, RolesDto> = {
        [Roles.SUPERVISOR]: RolesDto.SUPERVISOR,
        [Roles['TEAM-LEADER']]: RolesDto['TEAM-LEADER'],
        [Roles.AGENT]: RolesDto.AGENT,
    };

    mapFromDto(dtoValue: RolesDto | null): Roles | null {
        if (!dtoValue) {
            return null;
        }
        return this.dtoToEnum[dtoValue];
    }

    mapToDto(enumValue: Roles): RolesDto {
        return this.enumToDto[enumValue] ?? RolesDto.AGENT;
    }
}
