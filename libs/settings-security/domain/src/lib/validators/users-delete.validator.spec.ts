import { GenericRequiredError } from '@cmz/shared-domain';
import { validateUsersDelete } from './users-delete.validator';
import { UsersDeleteContract } from '../contracts/users-delete.contract';

describe('validateUsersDelete', () => {
    const validContract: UsersDeleteContract = { uniqId: 'user-1' };

    it('valide avec succès un contrat avec uniqId', () => {
        expect(() => validateUsersDelete(validContract)).not.toThrow();
    });

    it('lève GenericRequiredError si uniqId est absent', () => {
        expect(() => validateUsersDelete({})).toThrow(GenericRequiredError);
    });
});
