import { UsersEntity } from './users.entity';
import { UsersStatus } from '../enums/users-status.enum';
import { UsersProps } from '../props/users.props';

function makeProps(overrides: Partial<UsersProps> = {}): UsersProps {
    return {
        uniqId: 'user-1',
        lastName: 'Dupont',
        firstName: 'Jean',
        email: 'jean.dupont@example.com',
        phone: '+22507000000',
        profile: 'Administrateur',
        role: null,
        status: UsersStatus.ACTIVE,
        updatedAt: '2026-08-01T10:00:00.000Z',
        ...overrides,
    };
}

describe('UsersEntity — getters', () => {
    it('expose tous les champs depuis props', () => {
        const entity = new UsersEntity(makeProps());

        expect(entity.uniqId).toBe('user-1');
        expect(entity.lastName).toBe('Dupont');
        expect(entity.firstName).toBe('Jean');
        expect(entity.email).toBe('jean.dupont@example.com');
        expect(entity.phone).toBe('+22507000000');
        expect(entity.profile).toBe('Administrateur');
        expect(entity.role).toBeNull();
        expect(entity.status).toBe(UsersStatus.ACTIVE);
        expect(entity.updatedAt).toBe('2026-08-01T10:00:00.000Z');
    });
});

describe('UsersEntity.with', () => {
    it('retourne la même instance si updatedAt et uniqId sont identiques', () => {
        const entity = new UsersEntity(makeProps());
        const result = entity.with(makeProps());
        expect(result).toBe(entity);
    });

    it('retourne une nouvelle instance si updatedAt diffère', () => {
        const entity = new UsersEntity(makeProps());
        const result = entity.with(
            makeProps({ updatedAt: '2026-08-02T00:00:00.000Z' })
        );
        expect(result).not.toBe(entity);
        expect(result.updatedAt).toBe('2026-08-02T00:00:00.000Z');
    });

    it('retourne une nouvelle instance si uniqId diffère', () => {
        const entity = new UsersEntity(makeProps());
        const result = entity.with(makeProps({ uniqId: 'user-2' }));
        expect(result).not.toBe(entity);
        expect(result.uniqId).toBe('user-2');
    });
});
