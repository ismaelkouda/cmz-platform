import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { RegionOption } from '../interfaces/region-option.interface';

/**
 * Select "région", cascade jusqu'aux communes (department → municipality).
 * Consommé par les formulaires `department`/`municipality` pour dériver leurs
 * selects dépendants sans rappel réseau.
 */
export abstract class RegionSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<RegionOption[]>;
}
