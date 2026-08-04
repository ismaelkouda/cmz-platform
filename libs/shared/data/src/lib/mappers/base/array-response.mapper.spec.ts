import { describe, expect, it } from 'vitest';
import { ArrayResponseMapper } from './array-response.mapper';

/**
 * Chantier L (onzième passe, 2026-08-04) — base des mappers "liste plate"
 * (ex. options de select, sans pagination). Jamais testée en isolation.
 */
interface ItemDto {
    id: number;
    label: string;
}
interface ItemEntity {
    id: number;
    name: string;
}

class TestArrayResponseMapper extends ArrayResponseMapper<
    ItemEntity,
    ItemDto
> {
    protected mapItemFromDto(dto: ItemDto): ItemEntity {
        return { id: dto.id, name: dto.label.toUpperCase() };
    }
}

describe('ArrayResponseMapper', () => {
    it('mappe chaque élément du tableau via mapItemFromDto', () => {
        const mapper = new TestArrayResponseMapper();
        const result = mapper.mapFromDto({
            error: false,
            message: '',
            data: [
                { id: 1, label: 'infra' },
                { id: 2, label: 'boundary' },
            ],
        });
        expect(result).toEqual([
            { id: 1, name: 'INFRA' },
            { id: 2, name: 'BOUNDARY' },
        ]);
    });

    it('retourne un tableau vide sans erreur quand data est un tableau vide', () => {
        const mapper = new TestArrayResponseMapper();
        expect(
            mapper.mapFromDto({ error: false, message: '', data: [] })
        ).toEqual([]);
    });

    it('lève quand error est true', () => {
        const mapper = new TestArrayResponseMapper();
        expect(() =>
            mapper.mapFromDto({
                error: true,
                message: 'Erreur.',
                data: [],
            })
        ).toThrow();
    });
});
