import { GenericRequiredError } from '@cmz/shared-domain';
import { usersDisableVo } from './users-disable.vo';

describe('usersDisableVo', () => {
    it('retourne le contrat inchangé quand uniqId est présent', () => {
        const contract = { uniqId: 'user-1' };
        expect(usersDisableVo(contract)).toBe(contract);
    });

    it('délègue la validation à validateUsersDisable (uniqId absent → throw)', () => {
        expect(() => usersDisableVo({})).toThrow(GenericRequiredError);
    });
});
