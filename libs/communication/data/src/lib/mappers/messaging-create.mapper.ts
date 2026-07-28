import { Service, inject } from '@angular/core';
import { MessagingCreateValidateContract } from '@cmz/communication-domain';
import { MessagingCreateApiDto } from '../dtos/messaging-create-api.dto';
import { MessagingChannelMapper } from './messaging-channel.mapper';
import { MessagingTargetMapper } from './messaging-target.mapper';
import { MessagingTypeMapper } from './messaging-type.mapper';

@Service()
export class MessagingCreateMapper {
    private readonly typeMapper = inject(MessagingTypeMapper);
    private readonly targetMapper = inject(MessagingTargetMapper);
    private readonly channelMapper = inject(MessagingChannelMapper);

    mapContractToApi(
        contract: MessagingCreateValidateContract
    ): MessagingCreateApiDto {
        return {
            report_uniq_id: contract.reportId,
            type: this.typeMapper.mapToDto(contract.type),
            target_type: this.targetMapper.mapToDto(contract.targetType),
            region_id: contract.region,
            department_id: contract.department,
            municipality_id: contract.municipality,
            channels: contract.channels.map((channel) =>
                this.channelMapper.mapToDto(channel)
            ),
            subject: contract.subject,
            content: contract.content,
        };
    }
}
