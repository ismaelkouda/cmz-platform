import { Injectable, inject } from '@angular/core';
import { ResourcesFindOneQuery } from '@pages/seos-reference/application/queries/resources/resources-find-one.query';
import { ResourcesFindOneHandler } from '@pages/seos-reference/application/queries-handlers/resources/resources-find-one.handler';
import { ResourcesFindOneEntity } from '@pages/seos-reference/domain/entities/resources/resources-find-one.entity';
import { Observable } from 'rxjs';
import { FetchOptions } from '@shared/interface/fetch-options.interface';

@Injectable({ providedIn: 'root' })
export class ResourcesFindOneBus {
    private readonly filterHandler = inject(ResourcesFindOneHandler);

    dispatch<T>(
        query: T,
        options?: FetchOptions
    ): Observable<ResourcesFindOneEntity> {
        if (query instanceof ResourcesFindOneQuery) {
            return this.filterHandler.execute(query, options);
        }

        throw new Error('No handler found for query');
    }
}
