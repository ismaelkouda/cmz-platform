import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    TeamsCreateContract,
    TeamsDeleteContract,
    TeamsDisableContract,
    TeamsEnableContract,
    TeamsEntity,
    TeamsFilterContract,
    TeamsUpdateContract,
} from '@cmz/team-organization-domain';
import { TeamsUseCase } from '../use-cases/teams.use-case';

@Service()
export class TeamsFacade extends CollectionResourceFacade<
    TeamsEntity,
    TeamsFilterContract
> {
    private readonly useCase = inject(TeamsUseCase);

    protected stream(
        params: PageQuery<TeamsFilterContract>
    ): Observable<PageResult<TeamsEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: TeamsCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: TeamsUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: TeamsDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    enable(contract: TeamsEnableContract): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    disable(contract: TeamsDisableContract): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
