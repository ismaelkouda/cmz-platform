import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/**
 * Port de sélection — alimente le `p-select` équipe du formulaire
 * `participants` (référence par uniqId). Même précédent que
 * `coverage-areas/SiteGroupSelectRepository` : concept dédié, pas de
 * couplage au repository CRUD `teams` complet.
 */
export abstract class TeamsSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
