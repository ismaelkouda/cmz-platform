import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

/** Ajouté le 2026-08-04 (extension du backlog #3). Même forme que `HomeSelectRepository`. */
export abstract class NewsSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
