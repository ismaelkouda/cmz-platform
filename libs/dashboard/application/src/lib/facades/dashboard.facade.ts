import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    DashboardEntity,
    DashboardFilterContract,
} from '@cmz/dashboard-domain';
import { Observable } from 'rxjs';
import { DashboardUseCase } from '../use-cases/dashboard.use-case';

interface DashboardParams {
    filter: DashboardFilterContract;
    options?: FetchOptions;
}

/**
 * `ResourceFacade` (objet unique, pas de liste) — même archétype que
 * `MessagingFindOneFacade` : les statistiques du tableau de bord ne sont
 * pas une collection paginée, un seul objet agrégé par période.
 */
@Service()
export class DashboardFacade extends ResourceFacade<
    DashboardEntity,
    DashboardParams
> {
    private readonly useCase = inject(DashboardUseCase);

    protected stream(params: DashboardParams): Observable<DashboardEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    load(filter: DashboardFilterContract, options?: FetchOptions): void {
        this.setParams({ filter, options });
    }
}
