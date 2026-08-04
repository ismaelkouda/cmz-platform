import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/**
 * Ajouté le 2026-08-04 (backlog #3, uniformisation maximale sur
 * `crud-entity.pattern.json`, sur demande explicite : « reecris le code
 * pour atteindre les 100% »). Même forme que `SiteGroupSelectRepository`/
 * `TeamsSelectRepository` (modules déjà validés). Pas de consommateur UI
 * au moment de son ajout — complète la parité structurelle du cœur
 * `crud-entity` ; à câbler le jour où un écran a besoin de sélectionner un
 * `messaging` en dropdown.
 */
export abstract class MessagingSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
