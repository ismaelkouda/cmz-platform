import { GenericRequiredError } from '@cmz/shared-domain';
import { profilesPermissionsEnableVo } from './profiles-permissions-enable.vo';

describe('profilesPermissionsEnableVo', () => {
    it('retourne le contrat inchangé quand uniqId est présent', () => {
        const contract = { uniqId: 'prof-1' };
        expect(profilesPermissionsEnableVo(contract)).toBe(contract);
    });

    it('délègue la validation à validateProfilesPermissionsEnable (uniqId absent → throw)', () => {
        expect(() => profilesPermissionsEnableVo({})).toThrow(
            GenericRequiredError
        );
    });
});
