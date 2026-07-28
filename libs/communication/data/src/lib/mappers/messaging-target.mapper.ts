import { Service } from '@angular/core';
import { MessagingTarget } from '@cmz/communication-domain';
import { MessagingTargetApiDto } from '../dtos/messaging-target-api.dto';

@Service()
export class MessagingTargetMapper {
    private readonly dtoToDomain: Record<
        MessagingTargetApiDto,
        MessagingTarget
    > = {
        report: MessagingTarget.REPORT,
        area: MessagingTarget.AREA,
    };

    private readonly domainToDto: Record<
        MessagingTarget,
        MessagingTargetApiDto
    > = {
        [MessagingTarget.REPORT]: 'report',
        [MessagingTarget.AREA]: 'area',
    };

    mapFromDto(dto: MessagingTargetApiDto): MessagingTarget {
        return this.dtoToDomain[dto];
    }

    mapToDto(value: MessagingTarget): MessagingTargetApiDto {
        return this.domainToDto[value];
    }
}
