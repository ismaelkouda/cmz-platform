import { Service } from '@angular/core';
import {
    RadioRelayLinksEntity,
    RadioRelayLinksProps,
    RadioRelayLinksOperator,
    RadioRelayLinksFrequency,
    Status,
} from '@cmz/coverage-areas-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { RadioRelayLinksItemApiDto } from '../dtos/radio-relay-links-response-api.dto';

@Service()
export class RadioRelayLinksMapper extends PaginatedMapper<
    RadioRelayLinksEntity,
    RadioRelayLinksItemApiDto
> {
    private readonly entityCache = new Map<string, RadioRelayLinksEntity>();

    protected mapItemFromDto(
        dto: RadioRelayLinksItemApiDto
    ): RadioRelayLinksEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: RadioRelayLinksProps = {
            uniqId: dto.id,
            name: dto.name,
            operator: dto.operator as RadioRelayLinksOperator,
            frequency: dto.frequency as RadioRelayLinksFrequency,
            startDate: new Date(dto.start_date),
            endDate: new Date(dto.end_date),
            status: dto.is_active ? Status.ACTIVE : Status.INACTIVE,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new RadioRelayLinksEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
