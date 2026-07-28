import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TeamsPermissionOption } from '../props/teams-permission-option.props';

/**
 * Source des permissions disponibles pour le mode création du formulaire
 * `teams` (`GET teams-organization/teams/get-permissions-model` côté
 * source). En mode édition, les permissions cochées viennent directement
 * de `TeamsFindOneEntity.permissions` (embarquées dans la réponse
 * find-one) — ce port n'est donc utilisé qu'à la création, fidèle au
 * comportement du `teams-form.store.ts` source.
 */
export abstract class TeamsPermissionsRepository {
    abstract readAll(
        options?: FetchOptions
    ): Observable<TeamsPermissionOption[]>;
}
