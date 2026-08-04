import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { UsersSelectRepository } from '@cmz/settings-security-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class UsersSelectUseCase {
    private readonly repository = inject(UsersSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
