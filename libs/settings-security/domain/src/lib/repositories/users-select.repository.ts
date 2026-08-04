import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/**
 * Ajouté le 2026-08-04 (extension du backlog #3, uniformisation maximale
 * sur `crud-entity.pattern.json`). Même forme que `TeamsSelectRepository`/
 * `ParticipantsSelectRepository`. Pas de consommateur UI au moment de son
 * ajout — complète la parité structurelle du cœur `crud-entity`.
 */
export abstract class UsersSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
