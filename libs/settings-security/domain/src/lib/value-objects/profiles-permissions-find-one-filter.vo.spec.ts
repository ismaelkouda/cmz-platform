import { GenericRequiredError } from '@cmz/shared-domain';
import { profilesPermissionsFindOneFilterVo } from './profiles-permissions-find-one-filter.vo';

describe('profilesPermissionsFindOneFilterVo', () => {
    it('retourne le contrat inchangé quand uniqId est présent', () => {
        const contract = { uniqId: 'prof-1' };
        expect(profilesPermissionsFindOneFilterVo(contract)).toBe(contract);
    });

    it('délègue la validation à validateProfilesPermissionsFindOneFilter (uniqId absent → throw)', () => {
        expect(() => profilesPermissionsFindOneFilterVo({})).toThrow(
            GenericRequiredError
        );
    });
});
