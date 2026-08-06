import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { ParticipantsSelectUseCase } from '../use-cases/participants-select.use-case';
import { Observable } from 'rxjs';

interface ParticipantsSelectParams {
    options?: FetchOptions;
}

@Service()
export class ParticipantsSelectFacade extends ResourceFacade<
    SelectOption[],
    ParticipantsSelectParams
> {
    private readonly useCase = inject(ParticipantsSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(
        params: ParticipantsSelectParams
    ): Observable<SelectOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
