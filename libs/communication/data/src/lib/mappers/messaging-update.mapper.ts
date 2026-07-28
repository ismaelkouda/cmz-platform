import { Service, inject } from '@angular/core';
import { MessagingUpdateValidateContract } from '@cmz/communication-domain';
import { MessagingUpdateApiDto } from '../dtos/messaging-update-api.dto';
import { MessagingChannelMapper } from './messaging-channel.mapper';
import { MessagingTargetMapper } from './messaging-target.mapper';
import { MessagingTypeMapper } from './messaging-type.mapper';

@Service()
export class MessagingUpdateMapper {
    private readonly typeMapper = inject(MessagingTypeMapper);
    private readonly targetMapper = inject(MessagingTargetMapper);
    private readonly channelMapper = inject(MessagingChannelMapper);

    mapContractToApi(
        contract: MessagingUpdateValidateContract
    ): MessagingUpdateApiDto {
        return {
            id: contract.uniqId,
            report_uniq_id: contract.reportId,
            type: this.typeMapper.mapToDto(contract.type),
            target_type: this.targetMapper.mapToDto(contract.targetType),
            region: contract.region,
            department: contract.department,
            municipality: contract.municipality,
            channels: contract.channels.map((channel) =>
                this.channelMapper.mapToDto(channel)
            ),
            subject: contract.subject,
            content: contract.content,
        };
    }
}
