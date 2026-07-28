import { SimpleResponseMapper } from '@cmz/shared-data';
import { MapEntity } from '@cmz/interactive-map-domain';
import { MapItemDto } from '../dtos/map-response.dto';

export class MapMapper extends SimpleResponseMapper<MapEntity, MapItemDto> {
    protected override mapItemFromDto(dto: MapItemDto): MapEntity {
        const link = dto.mapLink ?? dto.map_link ?? '';
        return new MapEntity(link);
    }
}
