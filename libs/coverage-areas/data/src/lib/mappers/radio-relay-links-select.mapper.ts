import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { RadioRelayLinksSelectItemApiDto } from '../dtos/radio-relay-links-select-response-api.dto';

@Service()
export class RadioRelayLinksSelectMapper extends ArrayResponseMapper<
    SelectOption,
    RadioRelayLinksSelectItemApiDto
> {
    protected mapItemFromDto(
        dto: RadioRelayLinksSelectItemApiDto
    ): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.name, value: dto.id };
    }
}
