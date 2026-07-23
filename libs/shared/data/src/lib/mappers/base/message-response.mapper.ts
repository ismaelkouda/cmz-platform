import { MessageEntity } from '@cmz/shared-domain';
import { MessageResponseDto } from '../../dtos/simple-response.dto';
import { assertResponseOk } from '../../utils/unwrap-response.util';

export abstract class MessageResponseMapper {
    protected abstract mapItemFromDto(dto: MessageResponseDto): MessageEntity;

    mapFromMessage(dto: MessageResponseDto): MessageEntity {
        assertResponseOk(dto);
        return this.mapItemFromDto(dto);
    }
}
