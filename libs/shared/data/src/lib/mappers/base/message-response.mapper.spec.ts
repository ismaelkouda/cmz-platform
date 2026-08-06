import { describe, expect, it } from 'vitest';
import { MessageResponseMapper } from './message-response.mapper';
import { MessageResponseDto } from '../../dtos/simple-response.dto';
import { MessageEntity } from '@cmz/shared-domain';

/**
 * Chantier L (onzième passe, 2026-08-04) — base des mappers "message seul"
 * (DELETE/POST sans corps de retour). Particularité par rapport aux 3 autres
 * mappers de base : `mapItemFromDto` reçoit le DTO complet (pas de champ
 * `data` à dé-emballer), et la validation utilise `assertResponseOk` (pas
 * `unwrapResponse`) — jamais testée en isolation.
 */
class TestMessageResponseMapper extends MessageResponseMapper {
    protected mapItemFromDto(dto: MessageResponseDto): MessageEntity {
        return new MessageEntity({ error: dto.error, message: dto.message });
    }
}

describe('MessageResponseMapper', () => {
    it('mappe le dto complet (pas de data à dé-emballer) quand error est false', () => {
        const mapper = new TestMessageResponseMapper();
        const dto: MessageResponseDto = {
            error: false,
            message: 'Suppression réussie.',
        };
        const result = mapper.mapFromMessage(dto);
        expect(result).toBeInstanceOf(MessageEntity);
        expect(result.message).toBe('Suppression réussie.');
        expect(result.error).toBe(false);
    });

    it('lève avant même d’appeler mapItemFromDto quand error est true', () => {
        const mapper = new TestMessageResponseMapper();
        const dto: MessageResponseDto = {
            error: true,
            message: 'Suppression refusée.',
        };
        expect(() => mapper.mapFromMessage(dto)).toThrow();
    });
});
