import { GenericRequiredError } from '@cmz/shared-domain';
import { validateUsersEnable } from './users-enable.validator';
import { UsersEnableContract } from '../contracts/users-enable.contract';

describe('validateUsersEnable', () => {
    const validContract: UsersEnableContract = { uniqId: 'user-1' };

    it('valide avec succès un contrat avec uniqId', () => {
        expect(() => validateUsersEnable(validContract)).not.toThrow();
    });

    it('lève GenericRequiredError si uniqId est absent', () => {
        expect(() => validateUsersEnable({})).toThrow(GenericRequiredError);
    });
});
