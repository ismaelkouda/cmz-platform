import { Service } from '@angular/core';
import { TypeMedia } from '@cmz/shared-domain';
import { TypeMediaDto } from '../dtos/type-media.dto';

@Service()
export class TypeMediaMapper {
    mapFromDto(dto: TypeMediaDto): TypeMedia {
        const methodMap: Record<TypeMediaDto, TypeMedia> = {
            [TypeMediaDto.IMAGE]: TypeMedia.IMAGE,
            [TypeMediaDto.VIDEO]: TypeMedia.VIDEO,
        };
        return methodMap[dto];
    }

    mapToDto(value: TypeMedia): TypeMediaDto {
        const methodMap: Record<TypeMedia, TypeMediaDto> = {
            [TypeMedia.IMAGE]: TypeMediaDto.IMAGE,
            [TypeMedia.VIDEO]: TypeMediaDto.VIDEO,
        };
        return methodMap[value];
    }
}
