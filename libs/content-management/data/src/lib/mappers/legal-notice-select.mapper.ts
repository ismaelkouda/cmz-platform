import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { LegalNoticeSelectItemApiDto } from '../dtos/legal-notice-select-response-api.dto';

@Service()
export class LegalNoticeSelectMapper extends ArrayResponseMapper<
    SelectOption,
    LegalNoticeSelectItemApiDto
> {
    protected mapItemFromDto(
        dto: LegalNoticeSelectItemApiDto
    ): SelectOption {
        MapperUtils.validateDto(dto, { required: ['id'] });
        return { label: dto.version, value: dto.id };
    }
}
