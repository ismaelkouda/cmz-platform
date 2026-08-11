import { GenericRequiredError } from '@cmz/shared-domain';
import { validateProfilesPermissionsEnable } from './profiles-permissions-enable.validator';
import { ProfilesPermissionsEnableContract } from '../contracts/profiles-permissions-enable.contract';

describe('validateProfilesPermissionsEnable', () => {
    const validContract: ProfilesPermissionsEnableContract = {
        uniqId: 'prof-1',
    };

    it('valide avec succès un contrat avec uniqId', () => {
        expect(() =>
            validateProfilesPermissionsEnable(validContract)
        ).not.toThrow();
    });

    it('lève GenericRequiredError si uniqId est absent', () => {
        expect(() => validateProfilesPermissionsEnable({})).toThrow(
            GenericRequiredError
        );
    });
});
