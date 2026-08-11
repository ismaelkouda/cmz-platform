import { GenericRequiredError } from '@cmz/shared-domain';
import { validateProfilesPermissionsDelete } from './profiles-permissions-delete.validator';
import { ProfilesPermissionsDeleteContract } from '../contracts/profiles-permissions-delete.contract';

describe('validateProfilesPermissionsDelete', () => {
    const validContract: ProfilesPermissionsDeleteContract = {
        uniqId: 'prof-1',
    };

    it('valide avec succès un contrat avec uniqId', () => {
        expect(() =>
            validateProfilesPermissionsDelete(validContract)
        ).not.toThrow();
    });

    it('lève GenericRequiredError si uniqId est absent', () => {
        expect(() => validateProfilesPermissionsDelete({})).toThrow(
            GenericRequiredError
        );
    });
});
