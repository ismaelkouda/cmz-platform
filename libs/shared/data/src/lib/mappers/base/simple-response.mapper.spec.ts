import { describe, expect, it } from 'vitest';
import { SimpleResponseMapper } from './simple-response.mapper';
import { SimpleResponseDto } from '../../dtos/simple-response.dto';

/**
 * Chantier L (onzième passe, 2026-08-04) — base des mappers "objet unique"
 * (GET/POST détail, sans pagination). Jamais testée en isolation.
 */
interface ItemDto {
    id: number;
    label: string;
}
interface ItemEntity {
    id: number;
    name: string;
}

class TestSimpleResponseMapper extends SimpleResponseMapper<
    ItemEntity,
    ItemDto
> {
    protected mapItemFromDto(dto: ItemDto): ItemEntity {
        return { id: dto.id, name: dto.label.toUpperCase() };
    }
}

describe('SimpleResponseMapper', () => {
    it('délègue à mapItemFromDto la donnée dé-emballée', () => {
        const mapper = new TestSimpleResponseMapper();
        const dto: SimpleResponseDto<ItemDto> = {
            error: false,
            message: '',
            data: { id: 1, label: 'infra' },
        };
        expect(mapper.mapFromDto(dto)).toEqual({ id: 1, name: 'INFRA' });
    });

    it('lève quand error est true, sans jamais appeler mapItemFromDto', () => {
        const mapper = new TestSimpleResponseMapper();
        const dto: SimpleResponseDto<ItemDto> = {
            error: true,
            message: 'Introuvable.',
            data: { id: 1, label: 'infra' },
        };
        expect(() => mapper.mapFromDto(dto)).toThrow();
    });

    it('lève UnknownError quand data est absente malgré error:false', () => {
        const mapper = new TestSimpleResponseMapper();
        const dto = {
            error: false,
            message: '',
            data: null,
        } as unknown as SimpleResponseDto<ItemDto>;
        expect(() => mapper.mapFromDto(dto)).toThrow();
    });
});
