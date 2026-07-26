import { Service } from '@angular/core';
import { MediaStatus } from '@cmz/shared-domain';
import { MediaStatusDto } from '../dtos/media-status.dto';

@Service()
export class MediaStatusMapper {
    /** Wire boolean → code métier. */
    mapFromDto(dto: MediaStatusDto): MediaStatus {
        return dto === MediaStatusDto.ACTIVE
            ? MediaStatus.ACTIVE
            : MediaStatus.INACTIVE;
    }

    mapToDto(value: MediaStatus): MediaStatusDto {
        return value === MediaStatus.ACTIVE
            ? MediaStatusDto.ACTIVE
            : MediaStatusDto.INACTIVE;
    }
}
