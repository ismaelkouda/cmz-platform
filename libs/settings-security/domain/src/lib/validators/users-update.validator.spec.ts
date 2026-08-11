import { GenericRequiredError } from '@cmz/shared-domain';
import { validateUsersUpdate } from './users-update.validator';
import { UsersUpdateContract } from '../contracts/users-update.contract';

describe('validateUsersUpdate', () => {
    const validContract: UsersUpdateContract = {
        uniqId: 'user-1',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        phone: '+22507000000',
        profileId: 'prof-1',
    };

    it('valide avec succès un contrat complet', () => {
        expect(() => validateUsersUpdate(validContract)).not.toThrow();
    });

    it('lève GenericRequiredError si uniqId est absent', () => {
        const invalid = { ...validContract, uniqId: '' };
        expect(() => validateUsersUpdate(invalid)).toThrow(
            GenericRequiredError
        );
    });

    it('lève GenericRequiredError si firstName est absent', () => {
        const invalid = { ...validContract, firstName: '' };
        expect(() => validateUsersUpdate(invalid)).toThrow(
            GenericRequiredError
        );
    });

    it('lève GenericRequiredError si lastName est absent', () => {
        const invalid = { ...validContract, lastName: '' };
        expect(() => validateUsersUpdate(invalid)).toThrow(
            GenericRequiredError
        );
    });

    it('lève GenericRequiredError si email est absent', () => {
        const invalid = { ...validContract, email: '' };
        expect(() => validateUsersUpdate(invalid)).toThrow(
            GenericRequiredError
        );
    });

    it('lève GenericRequiredError si phone est absent', () => {
        const invalid = { ...validContract, phone: '' };
        expect(() => validateUsersUpdate(invalid)).toThrow(
            GenericRequiredError
        );
    });

    it('lève GenericRequiredError si profileId est absent', () => {
        const invalid = { ...validContract, profileId: '' };
        expect(() => validateUsersUpdate(invalid)).toThrow(
            GenericRequiredError
        );
    });
});
