import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    SiteGroupCreateContract,
    SiteGroupDeleteContract,
    SiteGroupEnableContract,
    SiteGroupDisableContract,
    SiteGroupEntity,
    SiteGroupFilterContract,
    SiteGroupRepository,
    SiteGroupUpdateContract,
    siteGroupCreateVo,
    siteGroupDeleteVo,
    siteGroupEnableVo,
    siteGroupDisableVo,
    siteGroupFilterEntity,
    siteGroupFilterVo,
    siteGroupUpdateVo,
} from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

/**
 * Service applicatif SiteGroup : orchestre validation (VO) + logique de filtre
 * (filter entity) + repository (port). Le `defer` reporte l'éventuel throw de
 * validation dans le flux (rendu via la loop d'erreurs).
 */
@Service()
export class SiteGroupUseCase {
    private readonly repository = inject(SiteGroupRepository);

    execute(
        contract: SiteGroupFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<SiteGroupEntity>> {
        return defer(() =>
            this.repository.execute(
                siteGroupFilterEntity(siteGroupFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: SiteGroupCreateContract): Observable<MessageEntity> {
        return defer(() => this.repository.create(siteGroupCreateVo(contract)));
    }

    update(contract: SiteGroupUpdateContract): Observable<MessageEntity> {
        return defer(() => this.repository.update(siteGroupUpdateVo(contract)));
    }

    delete(contract: SiteGroupDeleteContract): Observable<MessageEntity> {
        return defer(() => this.repository.delete(siteGroupDeleteVo(contract)));
    }

    enable(contract: SiteGroupEnableContract): Observable<MessageEntity> {
        return defer(() => this.repository.enable(siteGroupEnableVo(contract)));
    }

    disable(contract: SiteGroupDisableContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.disable(siteGroupDisableVo(contract))
        );
    }
}
