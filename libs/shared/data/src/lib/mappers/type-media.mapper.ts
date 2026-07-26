import { Service } from '@angular/core';
import { isTypeMedia, TypeMedia } from '@cmz/shared-domain';
import { TypeMediaDto } from '../dtos/type-media.dto';
import { ApiError } from '../errors/api.error';

@Service()
export class TypeMediaMapper {
    mapFromDto(dto: TypeMediaDto): TypeMedia {
        if (!isTypeMedia(dto)) {
            throw ApiError.invalidResponse(
                `TypeMedia wire inconnue: ${String(dto)}`
            );
        }
        return dto;
    }

    mapToDto(value: TypeMedia): TypeMediaDto {
        return value as TypeMediaDto;
    }

    parse(raw: string): TypeMedia {
        if (!isTypeMedia(raw)) {
            throw ApiError.invalidResponse(`TypeMedia wire inconnue: ${raw}`);
        }
        return raw;
    }
}
