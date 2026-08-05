import { describe, expect, it } from 'vitest';
import { InfrastructureTypeFindOneMapper } from './infrastructure-type-find-one.mapper';
import type { InfrastructureTypeFindOneItemApiDto } from '../dtos/infrastructure-type-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-infrastructure`, 5/6 fichiers. `InfrastructureTypeFindOneProps`
 * n'a **aucun** champ `status` — `is_active` est présent au wire mais
 * jamais lu par ce mapper (`InfrastructureTypeMapper`, la liste, seul à
 * porter un statut) — vérifié explicitement, pas supposé.
 */
function makeItemDto(
    partial: Partial<InfrastructureTypeFindOneItemApiDto> = {}
): InfrastructureTypeFindOneItemApiDto {
    return {
        id: 'ITYPE-001',
        name: 'Antenne',
        description: "Type d'infrastructure antenne",
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

describe('InfrastructureTypeFindOneMapper', () => {
    it('mappe le wire vers InfrastructureTypeFindOneEntity', () => {
        const mapper = new InfrastructureTypeFindOneMapper();
        const entity = mapper.mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('ITYPE-001');
        expect(entity.name).toBe('Antenne');
        expect(entity.description).toBe("Type d'infrastructure antenne");
        expect(entity.updatedAt).toBe('2026-07-02T10:00:00Z');
    });

    it("n'expose aucun statut — is_active présent au wire, absent de l'entité find-one (≠ liste)", () => {
        const entity = new InfrastructureTypeFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ is_active: false }),
        });
        expect('status' in entity).toBe(false);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new InfrastructureTypeFindOneMapper().mapFromDto({
                error: false,
                message: '',
                data: makeItemDto({ id: undefined as never }),
            })
        ).toThrow('Missing required fields: id');
    });
});
