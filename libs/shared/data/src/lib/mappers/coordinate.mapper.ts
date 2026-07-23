import { Service } from '@angular/core';
import { CoordinatesEntity } from '@cmz/shared-domain';

interface RawCoordinateDto {
    lat: string;
    long: string;
    what3words: string;
}

@Service()
export class CoordinateMapper {
    mapFromDto(dto: RawCoordinateDto): CoordinatesEntity {
        return new CoordinatesEntity(
            this.parseLatitude(dto.lat),
            this.parseLongitude(dto.long),
            this.normalizeWhat3Words(dto.what3words)
        );
    }

    private parseLatitude(lat: string): number {
        const parsed = Number.parseFloat(lat);
        return Number.isNaN(parsed) || parsed < -90 || parsed > 90 ? 0 : parsed;
    }

    private parseLongitude(long: string): number {
        const parsed = Number.parseFloat(long);
        return Number.isNaN(parsed) || parsed < -180 || parsed > 180
            ? 0
            : parsed;
    }

    private normalizeWhat3Words(words: string): string {
        if (!words) {
            return '';
        }
        return words.toLowerCase().replace(/[^\w.]/g, '');
    }
}
