import { GenericRequiredError } from '@cmz/shared-domain';
import { profilesPermissionsUpdateVo } from './profiles-permissions-update.vo';

describe('profilesPermissionsUpdateVo', () => {
    const validContract = {
        uniqId: 'prof-1',
        name: 'Administrateur',
        description: 'Super utilisateur',
        permissions: { organization: ['read', 'write'] },
    };

    it('retourne le contrat inchangé quand il est valide', () => {
        expect(profilesPermissionsUpdateVo(validContract)).toBe(validContract);
    });

    it('délègue la validation à validateProfilesPermissionsUpdate (name absent → throw)', () => {
        expect(() =>
            profilesPermissionsUpdateVo({ ...validContract, name: '' })
        ).toThrow(GenericRequiredError);
    });
});
