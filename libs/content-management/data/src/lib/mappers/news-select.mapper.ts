import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { NewsSelectItemApiDto } from '../dtos/news-select-response-api.dto';

@Service()
export class NewsSelectMapper extends ArrayResponseMapper<
    SelectOption,
    NewsSelectItemApiDto
> {
    protected mapItemFromDto(dto: NewsSelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.title, value: dto.id };
    }
}
