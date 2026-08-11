import { GenericRequiredError } from '@cmz/shared-domain';
import { usersCreateVo } from './users-create.vo';

describe('usersCreateVo', () => {
    const validContract = {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        phone: '+22507000000',
        profileId: 'prof-1',
    };

    it('retourne le contrat inchangé quand il est valide', () => {
        expect(usersCreateVo(validContract)).toBe(validContract);
    });

    it('délègue la validation à validateUsersCreate (email absent → throw)', () => {
        expect(() => usersCreateVo({ ...validContract, email: '' })).toThrow(
            GenericRequiredError
        );
    });
});
