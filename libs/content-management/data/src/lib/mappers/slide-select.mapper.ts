import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { SlideSelectItemApiDto } from '../dtos/slide-select-response-api.dto';

@Service()
export class SlideSelectMapper extends ArrayResponseMapper<
    SelectOption,
    SlideSelectItemApiDto
> {
    protected mapItemFromDto(dto: SlideSelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.title, value: dto.id };
    }
}
