import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { MessagingSelectUseCase } from '../use-cases/messaging-select.use-case';
import { Observable } from 'rxjs';

interface MessagingSelectParams {
    options?: FetchOptions;
}

@Service()
export class MessagingSelectFacade extends ResourceFacade<
    SelectOption[],
    MessagingSelectParams
> {
    private readonly useCase = inject(MessagingSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(params: MessagingSelectParams): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
