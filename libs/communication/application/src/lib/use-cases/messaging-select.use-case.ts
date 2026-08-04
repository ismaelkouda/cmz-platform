import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { MessagingSelectRepository } from '@cmz/communication-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class MessagingSelectUseCase {
    private readonly repository = inject(MessagingSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
