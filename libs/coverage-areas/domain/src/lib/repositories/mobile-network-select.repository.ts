import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/**
 * Ajouté le 2026-08-04 (backlog #3, uniformisation maximale sur
 * `crud-entity.pattern.json`, sur demande explicite : « reecris le code
 * pour atteindre les 100% »). Même forme que `SiteGroupSelectRepository`
 * (module de référence de la 3e validation), qui elle a un vrai
 * consommateur (`mobile-network-form.component.ts`). Ce port-ci n'a pas
 * encore de consommateur UI au moment de son ajout — complète la parité
 * structurelle du cœur `crud-entity` plutôt qu'une fonctionnalité
 * commandée par un besoin produit constaté ; à câbler le jour où un écran
 * a besoin de sélectionner un `mobile-network` en dropdown.
 */
export abstract class MobileNetworkSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
