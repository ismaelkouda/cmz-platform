import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { MapEntity } from '../entities/map.entity';

export abstract class InteractiveMapRepository {
    abstract getMap(options?: FetchOptions): Observable<MapEntity>;
}
