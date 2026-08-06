import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { HomeSelectItemApiDto } from '../dtos/home-select-response-api.dto';

@Service()
export class HomeSelectMapper extends ArrayResponseMapper<
    SelectOption,
    HomeSelectItemApiDto
> {
    protected mapItemFromDto(dto: HomeSelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.title, value: dto.id };
    }
}
