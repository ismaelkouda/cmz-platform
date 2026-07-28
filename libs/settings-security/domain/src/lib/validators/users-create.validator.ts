import { GenericRequiredError } from '@cmz/shared-domain';
import { UsersCreateContract } from '../contracts/users-create.contract';
import { UsersCreateValidateContract } from '../contracts/users-create.validate-contract';

/**
 * `role` n'est PAS validé/porté ici : mort en écriture dans le source
 * (commenté dans `UsersCreateApiDto`/`UsersUpdateApiDto` et leurs mappers —
 * l'API ne l'accepte qu'en lecture). Seul `profileId` permet d'associer un
 * profil (et donc indirectement un rôle) à la création.
 */
export function validateUsersCreate(
    contract: UsersCreateContract
): asserts contract is UsersCreateValidateContract {
    if (!contract.firstName) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.FORM.ERROR.CREATE.FIRST_NAME_REQUIRE'
        );
    }
    if (!contract.lastName) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.FORM.ERROR.CREATE.LAST_NAME_REQUIRE'
        );
    }
    if (!contract.email) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.FORM.ERROR.CREATE.EMAIL_REQUIRE'
        );
    }
    if (!contract.phone) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.FORM.ERROR.CREATE.PHONE_REQUIRE'
        );
    }
    if (!contract.profileId) {
        throw new GenericRequiredError(
            'SETTINGS_SECURITY.USERS.FORM.ERROR.CREATE.PROFILE_REQUIRE'
        );
    }
}
