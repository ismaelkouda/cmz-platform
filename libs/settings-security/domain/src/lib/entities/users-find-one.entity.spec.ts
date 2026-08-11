import { UsersFindOneEntity } from './users-find-one.entity';
import { UsersFindOneProps } from '../props/users-find-one.props';

function makeProps(
    overrides: Partial<UsersFindOneProps> = {}
): UsersFindOneProps {
    return {
        uniqId: 'user-1',
        lastName: 'Dupont',
        firstName: 'Jean',
        email: 'jean.dupont@example.com',
        phone: '+22507000000',
        profile: 'Administrateur',
        role: null,
        updatedAt: '2026-08-01T10:00:00.000Z',
        ...overrides,
    };
}

describe('UsersFindOneEntity — getters', () => {
    it('expose tous les champs depuis props', () => {
        const entity = new UsersFindOneEntity(makeProps());

        expect(entity.uniqId).toBe('user-1');
        expect(entity.lastName).toBe('Dupont');
        expect(entity.firstName).toBe('Jean');
        expect(entity.email).toBe('jean.dupont@example.com');
        expect(entity.phone).toBe('+22507000000');
        expect(entity.profile).toBe('Administrateur');
        expect(entity.role).toBeNull();
        expect(entity.updatedAt).toBe('2026-08-01T10:00:00.000Z');
    });
});

describe('UsersFindOneEntity.with', () => {
    it('retourne la même instance si updatedAt et uniqId sont identiques', () => {
        const entity = new UsersFindOneEntity(makeProps());
        const result = entity.with(makeProps());
        expect(result).toBe(entity);
    });

    it('retourne une nouvelle instance si updatedAt diffère', () => {
        const entity = new UsersFindOneEntity(makeProps());
        const result = entity.with(
            makeProps({ updatedAt: '2026-08-02T00:00:00.000Z' })
        );
        expect(result).not.toBe(entity);
        expect(result.updatedAt).toBe('2026-08-02T00:00:00.000Z');
    });
});
