import { GenericRequiredError } from '@cmz/shared-domain';
import { usersEnableVo } from './users-enable.vo';

describe('usersEnableVo', () => {
    it('retourne le contrat inchangé quand uniqId est présent', () => {
        const contract = { uniqId: 'user-1' };
        expect(usersEnableVo(contract)).toBe(contract);
    });

    it('délègue la validation à validateUsersEnable (uniqId absent → throw)', () => {
        expect(() => usersEnableVo({})).toThrow(GenericRequiredError);
    });
});
