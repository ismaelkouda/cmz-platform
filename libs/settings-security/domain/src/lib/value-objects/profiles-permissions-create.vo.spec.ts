import { GenericRequiredError } from '@cmz/shared-domain';
import { profilesPermissionsCreateVo } from './profiles-permissions-create.vo';

describe('profilesPermissionsCreateVo', () => {
    const validContract = {
        name: 'Administrateur',
        description: 'Super utilisateur',
        permissions: { organization: ['read', 'write'] },
    };

    it('retourne le contrat inchangé quand il est valide', () => {
        expect(profilesPermissionsCreateVo(validContract)).toBe(validContract);
    });

    it('délègue la validation à validateProfilesPermissionsCreate (name absent → throw)', () => {
        expect(() =>
            profilesPermissionsCreateVo({ ...validContract, name: '' })
        ).toThrow(GenericRequiredError);
    });
});
