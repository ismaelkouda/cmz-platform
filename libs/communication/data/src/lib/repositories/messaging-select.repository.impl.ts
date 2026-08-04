import { Service, inject } from '@angular/core';
import { MessagingSelectRepository } from '@cmz/communication-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { MessagingSelectMapper } from '../mappers/messaging-select.mapper';
import { MessagingSelectApi } from '../sources/messaging-select.api';

@Service()
export class MessagingSelectRepositoryImpl
    implements MessagingSelectRepository
{
    private readonly api = inject(MessagingSelectApi);
    private readonly mapper = inject(MessagingSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
