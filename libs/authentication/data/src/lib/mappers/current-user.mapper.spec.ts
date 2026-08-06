import { describe, expect, it } from 'vitest';
import {
    mapAuthTokenFromDto,
    mapCurrentUserFromDto,
    mapUserPermissionFromDto,
} from './current-user.mapper';
import {
    AuthTokenApiDto,
    CurrentUserApiDto,
    UserPermissionApiDto,
} from '../dtos/current-user-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — fonctions
 * wire → domaine appelées uniquement par `login` (module `authentication`,
 * même zone que le bug P0 corrigé en I-7 sur `permissionGuard`). Jamais
 * testées : la conversion snake_case → camelCase et la récursion sur
 * `children` sont des points de rupture silencieuse (un champ mal mappé ici
 * casse l'affichage des permissions, pas la compilation).
 */
describe('mapUserPermissionFromDto', () => {
    const base: UserPermissionApiDto = {
        id: 1,
        level: 0,
        title: 'Administration',
        label: 'admin',
        code: 'ADMIN',
        head_code: 'ROOT',
        icon: 'shield',
        type: 'menu',
    };

    it('convertit head_code (wire) en headCode (domaine)', () => {
        const result = mapUserPermissionFromDto(base);
        expect(result.headCode).toBe('ROOT');
    });

    it('reporte tous les champs requis fidèlement', () => {
        const result = mapUserPermissionFromDto(base);
        expect(result).toMatchObject({
            id: 1,
            level: 0,
            title: 'Administration',
            label: 'admin',
            code: 'ADMIN',
            headCode: 'ROOT',
            icon: 'shield',
            type: 'menu',
        });
    });

    it('laisse les champs optionnels absents à undefined, sans valeur par défaut inventée', () => {
        const result = mapUserPermissionFromDto(base);
        expect(result.path).toBeUndefined();
        expect(result.active).toBeUndefined();
        expect(result.expanded).toBeUndefined();
        expect(result.statut).toBeUndefined();
        expect(result.children).toBeUndefined();
    });

    it('mappe récursivement children, à profondeur > 1', () => {
        const dto: UserPermissionApiDto = {
            ...base,
            children: [
                {
                    ...base,
                    id: 2,
                    label: 'users',
                    children: [{ ...base, id: 3, label: 'roles' }],
                },
            ],
        };
        const result = mapUserPermissionFromDto(dto);
        expect(result.children).toHaveLength(1);
        expect(result.children?.[0].label).toBe('users');
        expect(result.children?.[0].children).toHaveLength(1);
        expect(result.children?.[0].children?.[0].label).toBe('roles');
    });

    it('conserve un tableau children vide tel quel (distinct de absent)', () => {
        const dto: UserPermissionApiDto = { ...base, children: [] };
        const result = mapUserPermissionFromDto(dto);
        expect(result.children).toEqual([]);
    });
});

describe('mapCurrentUserFromDto', () => {
    const dto: CurrentUserApiDto = {
        id: 42,
        last_name: 'Kouda',
        first_name: 'Ismael',
        email: 'ismael@example.com',
        profile: 'admin',
        phone: '0102030405',
        is_admin: true,
        enable2fa: false,
        status: 'active',
        photo: '/photo.png',
        permissions: [
            {
                id: 1,
                level: 0,
                title: 'Administration',
                label: 'admin',
                code: 'ADMIN',
                head_code: 'ROOT',
                icon: 'shield',
                type: 'menu',
            },
        ],
        paths: ['/admin', '/admin/users'],
        actions: { admin: ['create', 'delete'] },
    };

    it('convertit tous les champs snake_case du wire en camelCase domaine', () => {
        const result = mapCurrentUserFromDto(dto);
        expect(result).toMatchObject({
            id: 42,
            lastName: 'Kouda',
            firstName: 'Ismael',
            email: 'ismael@example.com',
            isAdmin: true,
            enable2fa: false,
            status: 'active',
        });
    });

    it('mappe le tableau permissions via mapUserPermissionFromDto', () => {
        const result = mapCurrentUserFromDto(dto);
        expect(result.permissions).toHaveLength(1);
        expect(result.permissions[0].headCode).toBe('ROOT');
    });

    it('reporte actions tel quel (Record déjà bien formé côté wire)', () => {
        const result = mapCurrentUserFromDto(dto);
        expect(result.actions).toEqual({ admin: ['create', 'delete'] });
    });

    it('reporte actions: null tel quel, sans le transformer en objet vide', () => {
        const result = mapCurrentUserFromDto({ ...dto, actions: null });
        expect(result.actions).toBeNull();
    });

    it('reporte paths tel quel', () => {
        const result = mapCurrentUserFromDto(dto);
        expect(result.paths).toEqual(['/admin', '/admin/users']);
    });
});

describe('mapAuthTokenFromDto', () => {
    it('convertit expires_at (wire) en expiresAt (domaine)', () => {
        const dto: AuthTokenApiDto = {
            value: 'jwt-token-abc',
            expires_at: '2026-12-31T23:59:59Z',
        };
        const result = mapAuthTokenFromDto(dto);
        expect(result).toEqual({
            value: 'jwt-token-abc',
            expiresAt: '2026-12-31T23:59:59Z',
        });
    });
});
