import { UsersFilterContract } from '../contracts/users-filter.contract';

/**
 * Étape « entité de filtre » du pattern crud-entity, manquante ici
 * jusqu'au 2026-08-04. `UsersFilterContract` n'a aucun champ de plage de
 * dates (`search?`/`profile?`/`role?`/`status?` seulement) — fonction
 * identité, même situation que `profiles-permissions` dans ce même module.
 */
export function usersFilterEntity(
    contract: UsersFilterContract
): UsersFilterContract {
    return contract;
}
