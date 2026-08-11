import { GenericRequiredError } from '@cmz/shared-domain';
import { validateProfilesPermissionsDisable } from './profiles-permissions-disable.validator';
import { ProfilesPermissionsDisableContract } from '../contracts/profiles-permissions-disable.contract';

describe('validateProfilesPermissionsDisable', () => {
    const validContract: ProfilesPermissionsDisableContract = {
        uniqId: 'prof-1',
    };

    it('valide avec succès un contrat avec uniqId', () => {
        expect(() =>
            validateProfilesPermissionsDisable(validContract)
        ).not.toThrow();
    });

    it('lève GenericRequiredError si uniqId est absent', () => {
        expect(() => validateProfilesPermissionsDisable({})).toThrow(
            GenericRequiredError
        );
    });
});
