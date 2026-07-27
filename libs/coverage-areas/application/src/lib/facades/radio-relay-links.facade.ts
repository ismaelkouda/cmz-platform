import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    RadioRelayLinksCreateContract,
    RadioRelayLinksDeleteContract,
    RadioRelayLinksDisableContract,
    RadioRelayLinksEnableContract,
    RadioRelayLinksEntity,
    RadioRelayLinksFilterContract,
    RadioRelayLinksUpdateContract,
} from '@cmz/coverage-areas-domain';
import { RadioRelayLinksUseCase } from '../use-cases/radio-relay-links.use-case';

@Service()
export class RadioRelayLinksFacade extends CollectionResourceFacade<
    RadioRelayLinksEntity,
    RadioRelayLinksFilterContract
> {
    private readonly useCase = inject(RadioRelayLinksUseCase);

    protected stream(
        params: PageQuery<RadioRelayLinksFilterContract>
    ): Observable<PageResult<RadioRelayLinksEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: RadioRelayLinksCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: RadioRelayLinksUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: RadioRelayLinksDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }

    enable(contract: RadioRelayLinksEnableContract): void {
        this.runAction(
            this.useCase.enable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    disable(contract: RadioRelayLinksDisableContract): void {
        this.runAction(
            this.useCase.disable(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }
}
