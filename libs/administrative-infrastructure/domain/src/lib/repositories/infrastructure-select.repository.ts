import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { Observable } from 'rxjs';

export abstract class InfrastructureSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
