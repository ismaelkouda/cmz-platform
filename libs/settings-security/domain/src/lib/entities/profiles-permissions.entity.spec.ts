import { ProfilesPermissionsEntity } from './profiles-permissions.entity';
import { ProfilesPermissionsStatus } from '../enums/profiles-permissions-status.enum';
import { ProfilesPermissionsProps } from '../props/profiles-permissions.props';

function makeProps(
    overrides: Partial<ProfilesPermissionsProps> = {}
): ProfilesPermissionsProps {
    return {
        uniqId: 'prof-1',
        name: 'Administrateur',
        slug: 'administrateur',
        description: 'Super utilisateur',
        usersCount: 3,
        status: ProfilesPermissionsStatus.ACTIVE,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
        ...overrides,
    };
}

describe('ProfilesPermissionsEntity — getters', () => {
    it('expose tous les champs depuis props', () => {
        const entity = new ProfilesPermissionsEntity(makeProps());

        expect(entity.uniqId).toBe('prof-1');
        expect(entity.name).toBe('Administrateur');
        expect(entity.slug).toBe('administrateur');
        expect(entity.description).toBe('Super utilisateur');
        expect(entity.usersCount).toBe(3);
        expect(entity.status).toBe(ProfilesPermissionsStatus.ACTIVE);
        expect(entity.createdAt).toBe('2026-07-01T00:00:00.000Z');
        expect(entity.updatedAt).toBe('2026-08-01T10:00:00.000Z');
    });
});

describe('ProfilesPermissionsEntity.with', () => {
    it('retourne la même instance si updatedAt et uniqId sont identiques', () => {
        const entity = new ProfilesPermissionsEntity(makeProps());
        const result = entity.with(makeProps());
        expect(result).toBe(entity);
    });

    it('retourne une nouvelle instance si updatedAt diffère', () => {
        const entity = new ProfilesPermissionsEntity(makeProps());
        const result = entity.with(
            makeProps({ updatedAt: '2026-08-02T00:00:00.000Z' })
        );
        expect(result).not.toBe(entity);
        expect(result.updatedAt).toBe('2026-08-02T00:00:00.000Z');
    });

    it('retourne une nouvelle instance si uniqId diffère', () => {
        const entity = new ProfilesPermissionsEntity(makeProps());
        const result = entity.with(makeProps({ uniqId: 'prof-2' }));
        expect(result).not.toBe(entity);
        expect(result.uniqId).toBe('prof-2');
    });
});
