import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { MunicipalityOption } from '../interfaces/municipality-option.interface';

/**
 * Ajouté le 2026-08-04 (extension du backlog #3). Réutilise
 * `MunicipalityOption` (déjà défini, feuille du cascade region → department
 * → municipality consommée par `DepartmentSelectMapper`/`RegionSelectMapper`)
 * plutôt que le `SelectOption` générique du kernel — cohérent avec
 * `RegionSelectRepository`/`DepartmentSelectRepository`, seuls autres select
 * de ce module, qui exposent tous deux un type `{Entity}Option` propre au
 * module. Contrairement à region/department, municipality est la feuille du
 * cascade : aucun enfant à imbriquer, `readAll` retourne une liste plate.
 */
export abstract class MunicipalitySelectRepository {
    abstract readAll(options?: FetchOptions): Observable<MunicipalityOption[]>;
}
