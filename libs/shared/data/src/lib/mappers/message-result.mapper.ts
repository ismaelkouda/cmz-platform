import { Service } from '@angular/core';
import { MessageEntity } from '@cmz/shared-domain';
import { MessageResponseDto } from '../dtos/simple-response.dto';
import { MessageResponseMapper } from './base/message-response.mapper';

@Service()
export class MessageResultMapper extends MessageResponseMapper {
    protected mapItemFromDto(dto: MessageResponseDto): MessageEntity {
        return new MessageEntity({ error: dto.error, message: dto.message });
    }
}
