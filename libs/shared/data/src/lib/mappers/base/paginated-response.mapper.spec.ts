import { describe, expect, it } from 'vitest';
import { PaginatedMapper } from './paginated-response.mapper';
import { PaginatedResponseDto } from '../../dtos/simple-response.dto';

/**
 * Chantier L (onzième passe, 2026-08-04) — `PaginatedMapper` est étendue par
 * chaque mapper paginé des modules métier (infrastructure, boundary, etc.),
 * mais elle-même n'avait jamais été testée en isolation. Sous-classe de
 * test minimale : mappe `{id, label}` → `{id, name}` pour vérifier que
 * `mapItemFromDto` est bien appliqué à chaque élément et que les métadonnées
 * de pagination (snake_case réseau → camelCase domaine) sont correctement
 * traduites, indépendamment de toute implémentation métier réelle.
 */
interface ItemDto {
    id: number;
    label: string;
}
interface ItemEntity {
    id: number;
    name: string;
}

class TestPaginatedMapper extends PaginatedMapper<ItemEntity, ItemDto> {
    protected mapItemFromDto(dto: ItemDto): ItemEntity {
        return { id: dto.id, name: dto.label.toUpperCase() };
    }
}

function buildDto(
    data: ItemDto[],
    overrides: Partial<PaginatedResponseDto<ItemDto>['data']> = {}
): PaginatedResponseDto<ItemDto> {
    return {
        error: false,
        message: '',
        data: {
            current_page: 1,
            data,
            first_page_url: '',
            from: 1,
            last_page: 1,
            last_page_url: '',
            links: [],
            next_page_url: '',
            path: '',
            per_page: 15,
            prev_page_url: '',
            to: data.length,
            total: data.length,
            ...overrides,
        },
    };
}

describe('PaginatedMapper', () => {
    it('mappe chaque élément via mapItemFromDto', () => {
        const mapper = new TestPaginatedMapper();
        const result = mapper.mapFromDto(
            buildDto([
                { id: 1, label: 'infra' },
                { id: 2, label: 'boundary' },
            ])
        );
        expect(result.items).toEqual([
            { id: 1, name: 'INFRA' },
            { id: 2, name: 'BOUNDARY' },
        ]);
    });

    it('traduit les métadonnées de pagination snake_case réseau vers camelCase domaine', () => {
        const mapper = new TestPaginatedMapper();
        const result = mapper.mapFromDto(
            buildDto([{ id: 1, label: 'x' }], {
                current_page: 3,
                last_page: 7,
                per_page: 25,
                total: 163,
            })
        );
        expect(result.currentPage).toBe(3);
        expect(result.lastPage).toBe(7);
        expect(result.perPage).toBe(25);
        expect(result.total).toBe(163);
    });

    it("retourne items:[] si data est absent dans l'enveloppe paginate (défensif)", () => {
        const mapper = new TestPaginatedMapper();
        const dto = buildDto([]);
        // Simule une réponse serveur où `data` est absent sur l'objet paginate.
        delete (dto.data as unknown as Record<string, unknown>)['data'];
        const result = mapper.mapFromDto(dto);
        expect(result.items).toEqual([]);
    });

    it('lève quand error est true — propage la conversion de unwrapResponse', () => {
        const mapper = new TestPaginatedMapper();
        const dto = buildDto([]);
        (dto as { error: boolean }).error = true;
        (dto as { message: string }).message = 'Erreur';
        expect(() => mapper.mapFromDto(dto)).toThrow();
    });
});
