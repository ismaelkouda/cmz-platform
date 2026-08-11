import { GenericRequiredError } from '@cmz/shared-domain';
import { validateProfilesPermissionsUpdate } from './profiles-permissions-update.validator';
import { ProfilesPermissionsUpdateContract } from '../contracts/profiles-permissions-update.contract';

describe('validateProfilesPermissionsUpdate', () => {
    const validContract: ProfilesPermissionsUpdateContract = {
        uniqId: 'prof-1',
        name: 'Administrateur',
        description: 'Super utilisateur',
        permissions: { organization: ['read', 'write'] },
    };

    it('valide avec succès un contrat complet', () => {
        expect(() =>
            validateProfilesPermissionsUpdate(validContract)
        ).not.toThrow();
    });

    it('lève GenericRequiredError si uniqId est absent', () => {
        const invalid = { ...validContract, uniqId: '' };
        expect(() => validateProfilesPermissionsUpdate(invalid)).toThrow(
            GenericRequiredError
        );
    });

    it('lève GenericRequiredError si name est absent', () => {
        const invalid = { ...validContract, name: '' };
        expect(() => validateProfilesPermissionsUpdate(invalid)).toThrow(
            GenericRequiredError
        );
    });

    it('lève GenericRequiredError si description est absente', () => {
        const invalid = { ...validContract, description: '' };
        expect(() => validateProfilesPermissionsUpdate(invalid)).toThrow(
            GenericRequiredError
        );
    });
});
