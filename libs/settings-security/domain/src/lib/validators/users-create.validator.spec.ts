import { GenericRequiredError } from '@cmz/shared-domain';
import { validateUsersCreate } from './users-create.validator';
import { UsersCreateContract } from '../contracts/users-create.contract';

describe('validateUsersCreate', () => {
    const validContract: UsersCreateContract = {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        phone: '+22507000000',
        profileId: 'prof-1',
    };

    it('valide avec succès un contrat complet', () => {
        expect(() => validateUsersCreate(validContract)).not.toThrow();
    });

    it('lève GenericRequiredError si firstName est absent', () => {
        const invalid = { ...validContract, firstName: '' };
        expect(() => validateUsersCreate(invalid)).toThrow(
            GenericRequiredError
        );
    });

    it('lève GenericRequiredError si email est absent', () => {
        const invalid = { ...validContract, email: '' };
        expect(() => validateUsersCreate(invalid)).toThrow(
            GenericRequiredError
        );
    });

    it('lève GenericRequiredError si profileId est absent', () => {
        const invalid = { ...validContract, profileId: '' };
        expect(() => validateUsersCreate(invalid)).toThrow(
            GenericRequiredError
        );
    });
});
