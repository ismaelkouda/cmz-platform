import { GenericRequiredError } from '@cmz/shared-domain';
import { validateUsersFindOneFilter } from './users-find-one-filter.validator';
import { UsersFindOneFilterContract } from '../contracts/users-find-one-filter.contract';

describe('validateUsersFindOneFilter', () => {
    const validContract: UsersFindOneFilterContract = { uniqId: 'user-1' };

    it('valide avec succès un contrat avec uniqId', () => {
        expect(() => validateUsersFindOneFilter(validContract)).not.toThrow();
    });

    it('lève GenericRequiredError si uniqId est absent', () => {
        expect(() => validateUsersFindOneFilter({})).toThrow(
            GenericRequiredError
        );
    });
});
