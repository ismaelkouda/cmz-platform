import { describe, expect, it } from 'vitest';
import { SimpleResponseDto } from '@cmz/shared-data';
import { ReportType, TelecomOperator } from '@cmz/shared-domain';
import { TeamsFindOneMapper } from './teams-find-one.mapper';
import type { TeamsFindOneItemApiDto } from '../dtos/teams-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `team-organization`, 2/5 fichiers. Exerce `flattenPermissionTree`
 * (utilitaire récursif, jamais testé directement) à travers le mapper —
 * reste dans le périmètre du chantier (le fichier appelant
 * `MapperUtils.validateDto` est le mapper, pas l'utilitaire).
 */
function makeItemDto(
    partial: Partial<TeamsFindOneItemApiDto> = {}
): TeamsFindOneItemApiDto {
    return {
        id: 'TEAM-001',
        code: 'T01',
        name: 'Équipe Littoral',
        description: 'Équipe couvrant le Littoral',
        report_types: ['abi', 'zob'],
        operators: ['mtn', 'orange'],
        permissions_json: [],
        ...partial,
    };
}

describe('TeamsFindOneMapper', () => {
    it('mappe le wire vers TeamsFindOneEntity', () => {
        const mapper = new TeamsFindOneMapper();
        const entity = mapper.mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });

        expect(entity.uniqId).toBe('TEAM-001');
        expect(entity.code).toBe('T01');
        expect(entity.name).toBe('Équipe Littoral');
        expect(entity.description).toBe('Équipe couvrant le Littoral');
    });

    it('filtre report_types/operators via isReportType/isTelecomOperator (valeurs wire inconnues silencieusement écartées)', () => {
        const entity = new TeamsFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({
                report_types: ['abi', 'valeur-inconnue'],
                operators: ['mtn', 'operateur-inconnu'],
            }),
        });
        expect(entity.reportTypes).toEqual([ReportType.ABI]);
        expect(entity.operators).toEqual([TelecomOperator.MTN]);
    });

    it('default report_types/operators à un tableau vide quand absents du wire', () => {
        const entity = new TeamsFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({
                report_types: undefined,
                operators: undefined,
            }),
        });
        expect(entity.reportTypes).toEqual([]);
        expect(entity.operators).toEqual([]);
    });

    it('default code/name/description à null quand absents du wire (champs optionnels)', () => {
        const entity = new TeamsFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({
                code: undefined,
                name: undefined,
                description: undefined,
            }),
        });
        expect(entity.code).toBeNull();
        expect(entity.name).toBeNull();
        expect(entity.description).toBeNull();
    });

    it("aplatit l'arbre de permissions (flattenPermissionTree), hiérarchie parent/enfant perdue par design", () => {
        const entity = new TeamsFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({
                permissions_json: [
                    {
                        data: {
                            value: 'admin',
                            title: 'Administration',
                            checked: true,
                        },
                        children: [
                            {
                                data: {
                                    value: 'admin.users',
                                    title: 'Utilisateurs',
                                },
                            },
                        ],
                    },
                ],
            }),
        });
        expect(entity.permissions).toEqual([
            { value: 'admin', label: 'Administration', checked: true },
            { value: 'admin.users', label: 'Utilisateurs', checked: false },
        ]);
    });

    it('retourne un tableau vide si permissions_json est vide', () => {
        const entity = new TeamsFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ permissions_json: [] }),
        });
        expect(entity.permissions).toEqual([]);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        const dto: SimpleResponseDto<TeamsFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeItemDto({ id: undefined as never }),
        };
        expect(() => new TeamsFindOneMapper().mapFromDto(dto)).toThrow(
            'Missing required fields: id'
        );
    });
});
