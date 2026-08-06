import { GenericRequiredError } from '@cmz/shared-domain';
import { validateProfilesPermissionsCreate } from './profiles-permissions-create.validator';
import { ProfilesPermissionsCreateContract } from '../contracts/profiles-permissions-create.contract';

describe('validateProfilesPermissionsCreate', () => {
    const validContract: ProfilesPermissionsCreateContract = {
        name: 'Administrateur',
        description: 'Super utilisateur',
        permissions: { organization: ['read', 'write'] },
    };

    it('valide avec succès un profil valide', () => {
        expect(() =>
            validateProfilesPermissionsCreate(validContract)
        ).not.toThrow();
    });

    it('lève GenericRequiredError si name est absent', () => {
        const invalid = { ...validContract, name: '' };
        expect(() => validateProfilesPermissionsCreate(invalid)).toThrow(
            GenericRequiredError
        );
    });

    it('lève GenericRequiredError si description est absente', () => {
        const invalid = { ...validContract, description: '' };
        expect(() => validateProfilesPermissionsCreate(invalid)).toThrow(
            GenericRequiredError
        );
    });
});
