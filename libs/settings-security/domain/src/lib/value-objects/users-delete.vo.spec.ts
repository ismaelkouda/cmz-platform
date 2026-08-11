import { GenericRequiredError } from '@cmz/shared-domain';
import { usersDeleteVo } from './users-delete.vo';

describe('usersDeleteVo', () => {
    it('retourne le contrat inchangé quand uniqId est présent', () => {
        const contract = { uniqId: 'user-1' };
        expect(usersDeleteVo(contract)).toBe(contract);
    });

    it('délègue la validation à validateUsersDelete (uniqId absent → throw)', () => {
        expect(() => usersDeleteVo({})).toThrow(GenericRequiredError);
    });
});
