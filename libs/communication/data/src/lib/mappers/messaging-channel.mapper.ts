import { Service } from '@angular/core';
import { MessagingChannel } from '@cmz/communication-domain';
import { MessagingChannelApiDto } from '../dtos/messaging-channel-api.dto';

@Service()
export class MessagingChannelMapper {
    private readonly dtoToDomain: Record<
        MessagingChannelApiDto,
        MessagingChannel
    > = {
        push: MessagingChannel.PUSH,
        mail: MessagingChannel.MAIL,
        sms: MessagingChannel.SMS,
    };

    private readonly domainToDto: Record<
        MessagingChannel,
        MessagingChannelApiDto
    > = {
        [MessagingChannel.PUSH]: 'push',
        [MessagingChannel.MAIL]: 'mail',
        [MessagingChannel.SMS]: 'sms',
    };

    mapFromDto(dto: MessagingChannelApiDto): MessagingChannel {
        return this.dtoToDomain[dto];
    }

    mapToDto(value: MessagingChannel): MessagingChannelApiDto {
        return this.domainToDto[value];
    }
}
