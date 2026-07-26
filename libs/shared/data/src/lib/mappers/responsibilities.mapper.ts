import { Service } from '@angular/core';
import { isRole, Role } from '@cmz/shared-domain';
import { ResponsibilitiesDto } from '../dtos/responsibilities.dto';
import { ApiError } from '../errors/api.error';

/** Wire `responsibilities` : leader = `leader`. */
@Service()
export class ResponsibilitiesMapper {
    mapFromDto(dto: ResponsibilitiesDto): Role {
        if (!isRole(dto)) {
            throw ApiError.invalidResponse(
                `ResponsibilitiesDto wire inconnue: ${String(dto)}`
            );
        }
        return dto;
    }

    mapToDto(value: Role): ResponsibilitiesDto {
        return value as ResponsibilitiesDto;
    }
}
