import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/**
 * `tower-type` est un concept **select seul** dans le domaine `coverage-areas`
 * (8 fichiers côté source, pas de CRUD) — consommé par le formulaire
 * `mobile-network` (`towerTypeId`). Pas d'entité/props : le port renvoie
 * directement des `SelectOption`, comme `SiteGroupSelectRepository`.
 */
export abstract class TowerTypeSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
