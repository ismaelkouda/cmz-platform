import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/**
 * Lecture seule — alimente le select `profil` (`profileId`) du formulaire
 * `users`. Même précédent que `TeamsSelectRepository` (team-organization) :
 * pas de CRUD séparé, juste un concept de sélection.
 */
export abstract class ProfilesPermissionsSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
