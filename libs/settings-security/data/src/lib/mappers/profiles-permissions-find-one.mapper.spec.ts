import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { ProfilesPermissionsFindOneMapper } from './profiles-permissions-find-one.mapper';
import type {
    PermissionApiDto,
    ProfilesPermissionsFindOneItemApiDto,
} from '../dtos/profiles-permissions-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `settings-security`, 6/6 fichiers (module complet). Le plus complexe des
 * 6 : `mapPermissionApiNode` (utilitaire récursif consommé par ce mapper)
 * reconstruit fidèlement un arbre nœud × action (décision actée de NE PAS
 * aplatir, contrairement à `flattenPermissionTree` de `team-organization`).
 * Comportement non trivial vérifié explicitement : quand un nœud n'a pas
 * ses propres `actions`, les clés d'action disponibles remontent de ses
 * enfants (union des clés), mais la **valeur** de chaque action du nœud
 * parent est son propre `checked`, pas celle héritée des enfants — un piège
 * de lecture facile (on pourrait croire que les valeurs des enfants
 * remontent aussi).
 */
function makeItemDto(
    partial: Partial<ProfilesPermissionsFindOneItemApiDto> = {}
): ProfilesPermissionsFindOneItemApiDto {
    return {
        uniq_id: 'PROFILE-001',
        name: 'Superviseur régional',
        description: 'Profil de supervision régionale',
        permissions: [],
        ...partial,
    };
}

describe('ProfilesPermissionsFindOneMapper', () => {
    it('mappe le wire vers ProfilesPermissionsFindOneEntity', () => {
        const mapper = new ProfilesPermissionsFindOneMapper();
        const entity = mapper.mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('PROFILE-001');
        expect(entity.name).toBe('Superviseur régional');
        expect(entity.description).toBe('Profil de supervision régionale');
    });

    it("default uniqId/name/description à '' quand absents du wire", () => {
        const entity = new ProfilesPermissionsFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({
                uniq_id: undefined,
                name: undefined,
                description: undefined,
            }),
        });
        expect(entity.uniqId).toBe('');
        expect(entity.name).toBe('');
        expect(entity.description).toBe('');
    });

    it('mappe un nœud feuille avec ses propres actions (hasOwnActions=true, spread tel quel)', () => {
        const permissions: PermissionApiDto[] = [
            {
                data: {
                    value: 'perm-a',
                    title: 'Permission A',
                    checked: true,
                    actions: { read: true, write: false },
                },
            },
        ];
        const entity = new ProfilesPermissionsFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ permissions }),
        });
        expect(entity.permissions).toEqual([
            {
                key: 'perm-a',
                label: 'Permission A',
                checked: true,
                actions: { read: true, write: false },
                children: [],
            },
        ]);
    });

    it("un nœud feuille sans actions ni enfants a des actions vides ({}), pas un objet par défaut inventé", () => {
        const permissions: PermissionApiDto[] = [
            { data: { value: 'perm-b', title: 'Permission B', checked: false } },
        ];
        const entity = new ProfilesPermissionsFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ permissions }),
        });
        expect(entity.permissions[0].actions).toEqual({});
    });

    it("un nœud parent sans actions propres dérive ses clés d'action des enfants, mais avec SA PROPRE valeur checked (pas celle des enfants)", () => {
        const permissions: PermissionApiDto[] = [
            {
                data: { value: 'group-1', title: 'Groupe 1', checked: true },
                children: [
                    {
                        data: {
                            value: 'perm-a',
                            title: 'Permission A',
                            checked: true,
                            actions: { read: true, write: false },
                        },
                    },
                    {
                        data: {
                            value: 'perm-b',
                            title: 'Permission B',
                            checked: false,
                        },
                    },
                ],
            },
        ];
        const entity = new ProfilesPermissionsFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ permissions }),
        });
        const group = entity.permissions[0];
        // Clés dérivées de l'enfant A (read, write) — l'enfant B n'a aucune
        // action propre, ne contribue rien à l'union.
        // Valeurs : le checked du GROUPE (true), pas celui de l'enfant A
        // (write était à false chez l'enfant).
        expect(group.actions).toEqual({ read: true, write: true });
        expect(group.children).toHaveLength(2);
        expect(group.children[0].actions).toEqual({ read: true, write: false });
    });

    it("un nœud parent sans actions propres et checked=false dérive des actions toutes à false", () => {
        const permissions: PermissionApiDto[] = [
            {
                data: { value: 'group-2', title: 'Groupe 2', checked: false },
                children: [
                    {
                        data: {
                            value: 'perm-c',
                            title: 'Permission C',
                            checked: true,
                            actions: { export: true },
                        },
                    },
                ],
            },
        ];
        const entity = new ProfilesPermissionsFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ permissions }),
        });
        expect(entity.permissions[0].actions).toEqual({ export: false });
    });

    it('recursion sur 3 niveaux de profondeur', () => {
        const permissions: PermissionApiDto[] = [
            {
                data: { value: 'l1', title: 'Niveau 1', checked: false },
                children: [
                    {
                        data: { value: 'l2', title: 'Niveau 2', checked: false },
                        children: [
                            {
                                data: {
                                    value: 'l3',
                                    title: 'Niveau 3',
                                    checked: true,
                                    actions: { delete: true },
                                },
                            },
                        ],
                    },
                ],
            },
        ];
        const entity = new ProfilesPermissionsFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ permissions }),
        });
        expect(entity.permissions[0].children[0].children[0].key).toBe('l3');
        expect(entity.permissions[0].children[0].children[0].actions).toEqual({
            delete: true,
        });
    });

    it('lève une erreur si permissions est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new ProfilesPermissionsFindOneMapper().mapFromDto({
                error: false,
                message: '',
                data: makeItemDto({ permissions: undefined as never }),
            })
        ).toThrow('Missing required fields: permissions');
    });
});
