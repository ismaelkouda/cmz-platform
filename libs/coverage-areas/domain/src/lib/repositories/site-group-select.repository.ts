import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/**
 * Port présent mais sans consommateur pour l'instant (décision 4 du plan) :
 * aucune des entités qui l'utiliseraient (`mobile-network`,
 * `optical-fiber-network`) n'est encore reconstruite.
 */
export abstract class SiteGroupSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
