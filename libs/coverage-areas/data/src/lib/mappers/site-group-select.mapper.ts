import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { SiteGroupSelectItemApiDto } from '../dtos/site-group-select-response-api.dto';

@Service()
export class SiteGroupSelectMapper extends ArrayResponseMapper<
    SelectOption,
    SiteGroupSelectItemApiDto
> {
    protected mapItemFromDto(dto: SiteGroupSelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.name, value: dto.id };
    }
}
