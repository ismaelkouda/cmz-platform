import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { TermsUseSelectItemApiDto } from '../dtos/terms-use-select-response-api.dto';

@Service()
export class TermsUseSelectMapper extends ArrayResponseMapper<
    SelectOption,
    TermsUseSelectItemApiDto
> {
    protected mapItemFromDto(dto: TermsUseSelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.version, value: dto.id };
    }
}
