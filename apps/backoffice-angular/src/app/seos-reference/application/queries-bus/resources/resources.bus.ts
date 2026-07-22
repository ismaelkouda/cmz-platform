import { Injectable, inject } from '@angular/core';
import { ResourcesQuery } from '@pages/seos-reference/application/queries/resources/resources.query';
import { ResourcesHandler } from '@pages/seos-reference/application/queries-handlers/resources/resources.handler';
import { ResourcesEntity } from '@pages/seos-reference/domain/entities/resources/resources.entity';
import { Paginate } from '@shared/data/dto/simple-response.dto';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesBus {
    private readonly handler = inject(ResourcesHandler);

    dispatch<T>(
        query: T,
        page: string,
        options?: FetchOptions
    ): Observable<Paginate<ResourcesEntity>> {
        if (query instanceof ResourcesQuery) {
            return this.handler.execute(query, page, options);
        }
        throw new Error('No handler found for query');
    }
}
