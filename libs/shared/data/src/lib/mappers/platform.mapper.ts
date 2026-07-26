import { Service } from '@angular/core';
import { isPlatform, Platform } from '@cmz/shared-domain';
import { PlatformDto } from '../dtos/platform.dto';
import { ApiError } from '../errors/api.error';

@Service()
export class PlatformMapper {
    mapFromDto(dto: PlatformDto): Platform {
        if (!isPlatform(dto)) {
            throw ApiError.invalidResponse(
                `Platform wire inconnue: ${String(dto)}`
            );
        }
        return dto;
    }

    mapToDto(value: Platform): PlatformDto {
        return value as PlatformDto;
    }

    /** Narrowing d'une string API brute (forms, query params). */
    parse(raw: string): Platform {
        if (!isPlatform(raw)) {
            throw ApiError.invalidResponse(`Platform wire inconnue: ${raw}`);
        }
        return raw;
    }
}
