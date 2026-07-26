import { Service } from '@angular/core';
import { isRole, Role } from '@cmz/shared-domain';
import { ProfilesDto } from '../dtos/profiles.dto';
import { ApiError } from '../errors/api.error';

/** Wire `profiles` : leader = `leader`. */
@Service()
export class ProfilesMapper {
    mapFromDto(dto: ProfilesDto): Role {
        if (!isRole(dto)) {
            throw ApiError.invalidResponse(
                `ProfilesDto wire inconnue: ${String(dto)}`
            );
        }
        return dto;
    }

    mapToDto(value: Role): ProfilesDto {
        return value as ProfilesDto;
    }
}
