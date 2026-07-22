import { Service } from '@angular/core';
import { Platform } from '@cmz/shared-domain';
import { PlatformDto } from '../dto/platform.dto';

@Service()
export class PlatformMapper {
    mapFromDto(dto: PlatformDto): Platform {
        const map: Record<PlatformDto, Platform> = {
            [PlatformDto.MOBILE]: Platform.MOBILE,
            [PlatformDto.WEB]: Platform.WEB,
            [PlatformDto.PWA]: Platform.PWA,
        };
        return map[dto];
    }

    mapToDto(value: Platform): PlatformDto {
        const map: Record<Platform, PlatformDto> = {
            [Platform.MOBILE]: PlatformDto.MOBILE,
            [Platform.WEB]: PlatformDto.WEB,
            [Platform.PWA]: PlatformDto.PWA,
        };
        return map[value];
    }
}
