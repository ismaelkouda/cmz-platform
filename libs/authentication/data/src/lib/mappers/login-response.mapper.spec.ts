import { describe, expect, it } from 'vitest';
import { LoginResponseMapper } from './login-response.mapper';
import { LoginItemApiDto } from '../dtos/login-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — 1 des 74
 * appelants de `MapperUtils.validateDto` répartis sur 12 modules (grep
 * exhaustif recompté cette passe ; le texte figé « 60+ appelants sur 13
 * modules » de `mapper-utils.spec.ts` était une estimation, pas un compte —
 * 74 fichiers réels sur 12 modules, `authentication` inclus). Module choisi
 * en premier : le plus petit (1 seul mappeur) et le plus sensible
 * (authentification/permissions, même zone que le bug P0 corrigé en I-7).
 *
 * `libs/authentication/data/project.json` n'avait **aucun** target `test`
 * avant cette passe — même trou de câblage CI que `shared/domain` (chantier
 * L, passe précédente) — corrigé avant d'écrire ce fichier, sans quoi il ne
 * serait jamais exécuté par `nx affected -t test` ni par la CI.
 */
describe('LoginResponseMapper', () => {
    const validDto: LoginItemApiDto = {
        token: { value: 'jwt-abc', expires_at: '2026-12-31T23:59:59Z' },
        user: {
            id: 1,
            last_name: 'Kouda',
            first_name: 'Ismael',
            email: 'ismael@example.com',
            profile: 'admin',
            phone: '0102030405',
            is_admin: true,
            enable2fa: false,
            status: 'active',
            photo: '/photo.png',
            permissions: [],
            paths: [],
            actions: null,
        },
        message: 'Connexion réussie.',
    };

    it('mappe un DTO complet vers LoginResponseEntity (user + token + message)', () => {
        const mapper = new LoginResponseMapper();
        const entity = mapper.mapFromDto({
            error: false,
            message: '',
            data: validDto,
        });
        expect(entity.user.email).toBe('ismael@example.com');
        expect(entity.user.isAdmin).toBe(true);
        expect(entity.token).toEqual({
            value: 'jwt-abc',
            expiresAt: '2026-12-31T23:59:59Z',
        });
        expect(entity.message).toBe('Connexion réussie.');
    });

    it('message reste undefined quand absent du DTO (champ optionnel)', () => {
        const mapper = new LoginResponseMapper();
        const dtoWithoutMessage: LoginItemApiDto = {
            token: validDto.token,
            user: validDto.user,
        };
        const entity = mapper.mapFromDto({
            error: false,
            message: '',
            data: dtoWithoutMessage,
        });
        expect(entity.message).toBeUndefined();
    });

    it('lève quand user est absent (MapperUtils.validateDto, champ requis)', () => {
        const mapper = new LoginResponseMapper();
        const dtoWithoutUser = { token: validDto.token };
        expect(() =>
            mapper.mapFromDto({
                error: false,
                message: '',
                data: dtoWithoutUser as unknown as LoginItemApiDto,
            })
        ).toThrow(/Missing required fields: user/);
    });

    it('lève quand token est absent (MapperUtils.validateDto, champ requis)', () => {
        const mapper = new LoginResponseMapper();
        const dtoWithoutToken = { user: validDto.user };
        expect(() =>
            mapper.mapFromDto({
                error: false,
                message: '',
                data: dtoWithoutToken as unknown as LoginItemApiDto,
            })
        ).toThrow(/Missing required fields: token/);
    });

    it('lève quand la réponse porte error: true, sans jamais mapper les données', () => {
        const mapper = new LoginResponseMapper();
        expect(() =>
            mapper.mapFromDto({
                error: true,
                message: 'Identifiants invalides.',
                data: validDto,
            })
        ).toThrow();
    });
});
