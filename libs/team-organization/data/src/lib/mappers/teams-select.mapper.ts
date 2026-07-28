import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { TeamsSelectItemApiDto } from '../dtos/teams-select-response-api.dto';

@Service()
export class TeamsSelectMapper extends ArrayResponseMapper<
    SelectOption,
    TeamsSelectItemApiDto
> {
    protected mapItemFromDto(dto: TeamsSelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });
        return { label: dto.name, value: dto.uniq_id };
    }
}
