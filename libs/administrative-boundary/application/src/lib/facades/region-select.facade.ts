import { Service, computed, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import { RegionOption } from '@cmz/administrative-boundary-domain';
import { RegionSelectUseCase } from '../use-cases/region-select.use-case';
import { Observable } from 'rxjs';

interface RegionSelectParams {
    options?: FetchOptions;
}

/**
 * Select cascade région → départements → communes : `RegionOption[]` porte
 * déjà les niveaux enfants (cf. décision « cascade select »), donc pas de
 * rappel réseau supplémentaire pour dériver les selects `department`/
 * `municipality` dépendants.
 */
@Service()
export class RegionSelectFacade extends ResourceFacade<
    RegionOption[],
    RegionSelectParams
> {
    private readonly useCase = inject(RegionSelectUseCase);

    readonly options = computed(() => this.value() ?? []);

    protected stream(params: RegionSelectParams): Observable<RegionOption[]> {
        return this.useCase.readAll(params.options);
    }

    load(options?: FetchOptions): void {
        this.setParams({ options });
    }
}
