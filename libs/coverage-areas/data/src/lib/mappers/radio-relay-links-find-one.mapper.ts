import { Service } from '@angular/core';
import {
    RadioRelayLinksFindOneEntity,
    RadioRelayLinksFindOneProps,
    RadioRelayLinksOperator,
    RadioRelayLinksFrequency,
} from '@cmz/coverage-areas-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { RadioRelayLinksFindOneItemApiDto } from '../dtos/radio-relay-links-find-one-response-api.dto';

@Service()
export class RadioRelayLinksFindOneMapper extends SimpleResponseMapper<
    RadioRelayLinksFindOneEntity,
    RadioRelayLinksFindOneItemApiDto
> {
    private readonly entityCache = new Map<
        string,
        RadioRelayLinksFindOneEntity
    >();

    protected mapItemFromDto(
        dto: RadioRelayLinksFindOneItemApiDto
    ): RadioRelayLinksFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: RadioRelayLinksFindOneProps = {
            uniqId: dto.id,
            name: dto.name,
            operator: dto.operator as RadioRelayLinksOperator,
            frequency: dto.frequency as RadioRelayLinksFrequency,
            startDate: new Date(dto.start_date),
            endDate: new Date(dto.end_date),
            updatedAt: dto.updated_at,
            geomUrl: dto.geom_url,
            geom: dto.geom,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new RadioRelayLinksFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
