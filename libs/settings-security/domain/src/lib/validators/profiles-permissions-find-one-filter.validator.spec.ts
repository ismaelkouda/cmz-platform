import { GenericRequiredError } from '@cmz/shared-domain';
import { validateProfilesPermissionsFindOneFilter } from './profiles-permissions-find-one-filter.validator';
import { ProfilesPermissionsFindOneFilterContract } from '../contracts/profiles-permissions-find-one-filter.contract';

describe('validateProfilesPermissionsFindOneFilter', () => {
    const validContract: ProfilesPermissionsFindOneFilterContract = {
        uniqId: 'prof-1',
    };

    it('valide avec succès un contrat avec uniqId', () => {
        expect(() =>
            validateProfilesPermissionsFindOneFilter(validContract)
        ).not.toThrow();
    });

    it('lève GenericRequiredError si uniqId est absent', () => {
        expect(() => validateProfilesPermissionsFindOneFilter({})).toThrow(
            GenericRequiredError
        );
    });
});
