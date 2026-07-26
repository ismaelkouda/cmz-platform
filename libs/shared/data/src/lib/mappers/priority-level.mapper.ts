import { Service } from '@angular/core';
import { isPriorityLevel, PriorityLevel } from '@cmz/shared-domain';
import { PriorityLevelDto } from '../dtos/priority-level.dto';
import { ApiError } from '../errors/api.error';

@Service()
export class PriorityLevelMapper {
    mapFromDto(dto: PriorityLevelDto): PriorityLevel {
        if (!isPriorityLevel(dto)) {
            throw ApiError.invalidResponse(
                `PriorityLevel wire inconnue: ${String(dto)}`
            );
        }
        return dto;
    }

    mapToDto(value: PriorityLevel): PriorityLevelDto {
        return value as PriorityLevelDto;
    }

    parse(raw: string): PriorityLevel {
        if (!isPriorityLevel(raw)) {
            throw ApiError.invalidResponse(
                `PriorityLevel wire inconnue: ${raw}`
            );
        }
        return raw;
    }
}
