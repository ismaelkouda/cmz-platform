import { GenericRequiredError } from '@cmz/shared-domain';
import { profilesPermissionsDisableVo } from './profiles-permissions-disable.vo';

describe('profilesPermissionsDisableVo', () => {
    it('retourne le contrat inchangé quand uniqId est présent', () => {
        const contract = { uniqId: 'prof-1' };
        expect(profilesPermissionsDisableVo(contract)).toBe(contract);
    });

    it('délègue la validation à validateProfilesPermissionsDisable (uniqId absent → throw)', () => {
        expect(() => profilesPermissionsDisableVo({})).toThrow(
            GenericRequiredError
        );
    });
});
