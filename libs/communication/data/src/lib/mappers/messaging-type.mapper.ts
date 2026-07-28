import { Service } from '@angular/core';
import { MessagingType } from '@cmz/communication-domain';
import { MessagingTypeApiDto } from '../dtos/messaging-type-api.dto';

@Service()
export class MessagingTypeMapper {
    private readonly dtoToDomain: Record<MessagingTypeApiDto, MessagingType> = {
        tip: MessagingType.TIP,
        education: MessagingType.EDUCATION,
        info: MessagingType.INFO,
        awareness: MessagingType.AWARENESS,
    };

    private readonly domainToDto: Record<MessagingType, MessagingTypeApiDto> = {
        [MessagingType.TIP]: 'tip',
        [MessagingType.EDUCATION]: 'education',
        [MessagingType.INFO]: 'info',
        [MessagingType.AWARENESS]: 'awareness',
    };

    mapFromDto(dto: MessagingTypeApiDto): MessagingType {
        return this.dtoToDomain[dto];
    }

    mapToDto(value: MessagingType): MessagingTypeApiDto {
        return this.domainToDto[value];
    }
}
