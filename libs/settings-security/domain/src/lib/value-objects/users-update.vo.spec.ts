import { GenericRequiredError } from '@cmz/shared-domain';
import { usersUpdateVo } from './users-update.vo';

describe('usersUpdateVo', () => {
    const validContract = {
        uniqId: 'user-1',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        phone: '+22507000000',
        profileId: 'prof-1',
    };

    it('retourne le contrat inchangé quand il est valide', () => {
        expect(usersUpdateVo(validContract)).toBe(validContract);
    });

    it('délègue la validation à validateUsersUpdate (phone absent → throw)', () => {
        expect(() => usersUpdateVo({ ...validContract, phone: '' })).toThrow(
            GenericRequiredError
        );
    });
});
