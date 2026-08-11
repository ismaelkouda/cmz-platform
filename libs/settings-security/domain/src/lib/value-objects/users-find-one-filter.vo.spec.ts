import { GenericRequiredError } from '@cmz/shared-domain';
import { usersFindOneFilterVo } from './users-find-one-filter.vo';

describe('usersFindOneFilterVo', () => {
    it('retourne le contrat inchangé quand uniqId est présent', () => {
        const contract = { uniqId: 'user-1' };
        expect(usersFindOneFilterVo(contract)).toBe(contract);
    });

    it('délègue la validation à validateUsersFindOneFilter (uniqId absent → throw)', () => {
        expect(() => usersFindOneFilterVo({})).toThrow(GenericRequiredError);
    });
});
