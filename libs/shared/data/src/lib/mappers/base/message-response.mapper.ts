import { MessageEntity } from '@cmz/shared-domain';
import { ApiError } from '../../errors/api.error';
import { MessageResponseDto } from '../../dtos/simple-response.dto';

export abstract class MessageResponseMapper {
    protected abstract mapItemFromDto(dto: MessageResponseDto): MessageEntity;

    mapFromMessage(dto: MessageResponseDto): MessageEntity {
        this.validateResponse(dto);
        return this.mapItemFromDto(dto);
    }

    private validateResponse(dto: MessageResponseDto): void {
        if (dto.error) {
            throw ApiError.invalidResponse(
                dto.message || 'Erreur API: la requête a échoué.'
            );
        }
    }
}
