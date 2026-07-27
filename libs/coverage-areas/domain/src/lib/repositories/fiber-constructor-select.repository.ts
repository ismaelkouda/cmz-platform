import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/**
 * `fiber-constructor` est un concept **select seul** (8 fichiers côté source,
 * pas de CRUD) — consommé par le formulaire `optical-fiber-network`
 * (`fiberConstructorId`). Même forme que `TowerTypeSelectRepository`.
 */
export abstract class FiberConstructorSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
