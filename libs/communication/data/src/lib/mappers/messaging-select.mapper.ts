import { Service } from '@angular/core';
import { SelectOption } from '@cmz/shared-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { MessagingSelectItemApiDto } from '../dtos/messaging-select-response-api.dto';

@Service()
export class MessagingSelectMapper extends ArrayResponseMapper<
    SelectOption,
    MessagingSelectItemApiDto
> {
    protected mapItemFromDto(dto: MessagingSelectItemApiDto): SelectOption {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });
        return { label: dto.subject, value: dto.uniq_id };
    }
}
