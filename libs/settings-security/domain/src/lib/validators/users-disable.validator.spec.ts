import { GenericRequiredError } from '@cmz/shared-domain';
import { validateUsersDisable } from './users-disable.validator';
import { UsersDisableContract } from '../contracts/users-disable.contract';

describe('validateUsersDisable', () => {
    const validContract: UsersDisableContract = { uniqId: 'user-1' };

    it('valide avec succès un contrat avec uniqId', () => {
        expect(() => validateUsersDisable(validContract)).not.toThrow();
    });

    it('lève GenericRequiredError si uniqId est absent', () => {
        expect(() => validateUsersDisable({})).toThrow(GenericRequiredError);
    });
});
