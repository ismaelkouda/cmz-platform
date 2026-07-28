import { Service, inject } from '@angular/core';
import {
    MessagingFindOneEntity,
    MessagingFindOneFilterValidateContract,
    MessagingFindOneRepository,
} from '@cmz/communication-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { messagingFindOneFilterMapper } from '../mappers/messaging-find-one-filter.mapper';
import { MessagingFindOneMapper } from '../mappers/messaging-find-one.mapper';
import { MessagingFindOneApi } from '../sources/messaging-find-one.api';

@Service()
export class MessagingFindOneRepositoryImpl implements MessagingFindOneRepository {
    private readonly api = inject(MessagingFindOneApi);
    private readonly mapper = inject(MessagingFindOneMapper);

    execute(
        filter: MessagingFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<MessagingFindOneEntity> {
        const dto = messagingFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
