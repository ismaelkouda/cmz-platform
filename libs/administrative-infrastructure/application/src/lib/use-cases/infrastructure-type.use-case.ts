import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    InfrastructureTypeCreateContract,
    InfrastructureTypeDeleteContract,
    InfrastructureTypeEnableContract,
    InfrastructureTypeDisableContract,
    InfrastructureTypeEntity,
    InfrastructureTypeFilterContract,
    InfrastructureTypeRepository,
    InfrastructureTypeUpdateContract,
    infrastructureTypeCreateVo,
    infrastructureTypeDeleteVo,
    infrastructureTypeEnableVo,
    infrastructureTypeDisableVo,
    infrastructureTypeFilterEntity,
    infrastructureTypeFilterVo,
    infrastructureTypeUpdateVo,
} from '@cmz/administrative-infrastructure-domain';
import { Observable, defer } from 'rxjs';

/**
 * Service applicatif InfrastructureType : orchestre validation (VO) + logique de filtre
 * (filter entity) + repository (port). Le `defer` reporte l'éventuel throw de
 * validation dans le flux (rendu via la loop d'erreurs).
 */
@Service()
export class InfrastructureTypeUseCase {
    private readonly repository = inject(InfrastructureTypeRepository);

    execute(
        contract: InfrastructureTypeFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<InfrastructureTypeEntity>> {
        return defer(() =>
            this.repository.execute(
                infrastructureTypeFilterEntity(
                    infrastructureTypeFilterVo(contract)
                ),
                page,
                options
            )
        );
    }

    create(
        contract: InfrastructureTypeCreateContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(infrastructureTypeCreateVo(contract))
        );
    }

    update(
        contract: InfrastructureTypeUpdateContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(infrastructureTypeUpdateVo(contract))
        );
    }

    delete(
        contract: InfrastructureTypeDeleteContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(infrastructureTypeDeleteVo(contract))
        );
    }

    enable(
        contract: InfrastructureTypeEnableContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.enable(infrastructureTypeEnableVo(contract))
        );
    }

    disable(
        contract: InfrastructureTypeDisableContract
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.disable(infrastructureTypeDisableVo(contract))
        );
    }
}
