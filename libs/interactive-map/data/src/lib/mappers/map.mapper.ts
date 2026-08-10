import { SimpleResponseMapper } from '@cmz/shared-data';
import { GrafanaLinkEntity } from '@cmz/shared-domain';
import { MapItemDto } from '../dtos/map-response.dto';

export class MapMapper extends SimpleResponseMapper<
    GrafanaLinkEntity,
    MapItemDto
> {
    protected override mapItemFromDto(dto: MapItemDto): GrafanaLinkEntity {
        const link = dto.mapLink ?? dto.map_link ?? '';
        return new GrafanaLinkEntity(link);
    }
}
