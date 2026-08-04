import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/**
 * Ajouté le 2026-08-04 (backlog #3, uniformisation maximale sur
 * `crud-entity.pattern.json`, sur demande explicite : « reecris le code
 * pour atteindre les 100% »). Même forme que `SiteGroupSelectRepository`/
 * `MessagingSelectRepository`. Pas de consommateur UI au moment de son
 * ajout — complète la parité structurelle du cœur `crud-entity`.
 */
export abstract class HomeSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
