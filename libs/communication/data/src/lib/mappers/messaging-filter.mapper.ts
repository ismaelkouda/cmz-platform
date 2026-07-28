import { Service, inject } from '@angular/core';
import { MessagingFilterContract } from '@cmz/communication-domain';
import { MessagingFilterApiDto } from '../dtos/messaging-filter-api.dto';
import { MessagingChannelMapper } from './messaging-channel.mapper';
import { MessagingTargetMapper } from './messaging-target.mapper';

@Service()
export class MessagingFilterMapper {
    private readonly targetMapper = inject(MessagingTargetMapper);
    private readonly channelMapper = inject(MessagingChannelMapper);

    mapContractToApi(contract: MessagingFilterContract): MessagingFilterApiDto {
        const params: MessagingFilterApiDto = {};
        if (contract.reportId) {
            params.report_id = contract.reportId;
        }
        if (contract.search) {
            params.search = contract.search;
        }
        if (contract.targetType) {
            params.target_type = this.targetMapper.mapToDto(
                contract.targetType
            );
        }
        if (contract.region) {
            params.region = contract.region;
        }
        if (contract.department) {
            params.department = contract.department;
        }
        if (contract.municipality) {
            params.municipality = contract.municipality;
        }
        if (contract.channels) {
            params.channels = contract.channels.map((channel) =>
                this.channelMapper.mapToDto(channel)
            );
        }
        if (contract.startDate) {
            params.start_date = contract.startDate.toISOString();
        }
        if (contract.endDate) {
            params.end_date = contract.endDate.toISOString();
        }
        return params;
    }
}
