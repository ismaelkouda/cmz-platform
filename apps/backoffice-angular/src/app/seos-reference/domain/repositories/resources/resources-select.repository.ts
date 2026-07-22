import { SelectOption } from '@shared/domain/interfaces/select-option.interface';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

export abstract class ResourcesSelectRepository {
    abstract readAll(options?: FetchOptions): Observable<SelectOption[]>;
}
