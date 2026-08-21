import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    ParticipantsCreateContract,
    ParticipantsDeleteContract,
    ParticipantsDisableContract,
    ParticipantsEnableContract,
    ParticipantsEntity,
    ParticipantsFilterContract,
    ParticipantsUpdateContract,
} from '@cmz/team-organization-domain';
import { ParticipantsUseCase } from '../use-cases/participants.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class ParticipantsFacade extends CollectionResourceFacade<
    ParticipantsEntity,
    ParticipantsFilterContract
> {
    private readonly useCase = inject(ParticipantsUseCase);

    protected stream(
        params: PageQuery<ParticipantsFilterContract>
    ): Observable<PageResult<ParticipantsEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: ParticipantsCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: ParticipantsUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: ParticipantsDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    enable(contract: ParticipantsEnableContract): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    disable(contract: ParticipantsDisableContract): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
