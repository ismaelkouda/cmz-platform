import { ProfilesPermissionsFilterContract } from '../contracts/profiles-permissions-filter.contract';

/**
 * Étape « entité de filtre » du pattern crud-entity, manquante ici jusqu'au
 * 2026-08-04 (extension du backlog #3 à `settings-security`, jamais
 * mesuré fichier par fichier auparavant). `ProfilesPermissionsFilterContract`
 * n'a aucun champ de plage de dates (`search?`/`user?`/`status?` seulement)
 * — fonction identité, même situation que `teams`/`participants` dans
 * `team-organization`.
 */
export function profilesPermissionsFilterEntity(
    contract: ProfilesPermissionsFilterContract
): ProfilesPermissionsFilterContract {
    return contract;
}
