import { ProfilesPermissionsFindOneEntity } from './profiles-permissions-find-one.entity';
import { ProfilesPermissionsFindOneProps } from '../props/profiles-permissions-find-one.props';

function makeProps(
    overrides: Partial<ProfilesPermissionsFindOneProps> = {}
): ProfilesPermissionsFindOneProps {
    return {
        uniqId: 'prof-1',
        name: 'Administrateur',
        description: 'Super utilisateur',
        permissions: [
            {
                key: 'organization',
                label: 'Organisation',
                checked: true,
                actions: { read: true, write: true },
                children: [],
            },
        ],
        ...overrides,
    };
}

describe('ProfilesPermissionsFindOneEntity — getters', () => {
    it('expose tous les champs depuis props', () => {
        const entity = new ProfilesPermissionsFindOneEntity(makeProps());

        expect(entity.uniqId).toBe('prof-1');
        expect(entity.name).toBe('Administrateur');
        expect(entity.description).toBe('Super utilisateur');
        expect(entity.permissions).toHaveLength(1);
        expect(entity.permissions[0].key).toBe('organization');
    });
});

describe('ProfilesPermissionsFindOneEntity.with', () => {
    it('retourne la même instance si uniqId est identique', () => {
        const entity = new ProfilesPermissionsFindOneEntity(makeProps());
        const result = entity.with(makeProps());
        expect(result).toBe(entity);
    });

    it('retourne une nouvelle instance si uniqId diffère', () => {
        const entity = new ProfilesPermissionsFindOneEntity(makeProps());
        const result = entity.with(makeProps({ uniqId: 'prof-2' }));
        expect(result).not.toBe(entity);
        expect(result.uniqId).toBe('prof-2');
    });
});
