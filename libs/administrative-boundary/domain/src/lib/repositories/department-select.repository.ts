import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { DepartmentOption } from '../interfaces/department-option.interface';

/**
 * Select "département", cascade jusqu'aux communes (department → municipality).
 * Consommé par le formulaire `municipality` pour dériver son select dépendant
 * sans rappel réseau. Contrairement à `RegionSelectRepository`, ce port n'est
 * pas paramétré par région : cf. `departments-by-region-id.repository.ts` pour
 * la lecture scoped-région (vue imbriquée).
 */
export abstract class DepartmentSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<DepartmentOption[]>;
}
