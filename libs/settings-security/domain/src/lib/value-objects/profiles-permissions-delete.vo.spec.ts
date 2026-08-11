import { GenericRequiredError } from '@cmz/shared-domain';
import { profilesPermissionsDeleteVo } from './profiles-permissions-delete.vo';

describe('profilesPermissionsDeleteVo', () => {
    it('retourne le contrat inchangé quand uniqId est présent', () => {
        const contract = { uniqId: 'prof-1' };
        expect(profilesPermissionsDeleteVo(contract)).toBe(contract);
    });

    it('délègue la validation à validateProfilesPermissionsDelete (uniqId absent → throw)', () => {
        expect(() => profilesPermissionsDeleteVo({})).toThrow(
            GenericRequiredError
        );
    });
});
