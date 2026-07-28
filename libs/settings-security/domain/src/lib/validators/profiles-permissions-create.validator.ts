import { GenericRequiredError } from '@cmz/shared-domain';
import { ProfilesPermissionsCreateContract } from '../contracts/profiles-permissions-create.contract';
import { ProfilesPermissionsCreateValidateContract } from '../contracts/profiles-permissions-create.validate-contract';

/**
 * `permissions` reste optionnel : un profil peut être créé sans aucune
 * action cochée (état valide, cf. le `?` du DTO source) — la matrice
 * complète (nœud -> actions cochées) est assemblée côté UI par l'arbre
 * interactif, pas ici (le domaine ne fait que transporter la map déjà
 * aplatie, aucune transformation réelle n'a lieu).
 */
export function validateProfilesPermissionsCreate(
    contract: ProfilesPermissionsCreateContract
): asserts contract is ProfilesPermissionsCreateValidateContract {
    if (!contract.name) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.PROFILES_PERMISSIONS.FORM.ERROR.CREATE.NAME_REQUIRE'
        );
    }
    if (!contract.description) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.PROFILES_PERMISSIONS.FORM.ERROR.CREATE.DESCRIPTION_REQUIRE'
        );
    }
}
