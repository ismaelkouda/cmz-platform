import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    InfrastructureCreateContract,
    InfrastructureDeleteContract,
    InfrastructureEntity,
    InfrastructureFilterContract,
    InfrastructureRepository,
    InfrastructureUpdateContract,
    infrastructureCreateVo,
    infrastructureDeleteVo,
    infrastructureFilterEntity,
    infrastructureFilterVo,
    infrastructureUpdateVo,
} from '@cmz/administrative-infrastructure-domain';
import { Observable, defer } from 'rxjs';

/**
 * Service applicatif Infrastructure : orchestre validation (VO) + logique de filtre
 * (filter entity) + repository (port). Le `defer` reporte l'éventuel throw de
 * validation dans le flux (rendu via la loop d'erreurs).
 */
@Service()
export class InfrastructureUseCase {
    private readonly repository = inject(InfrastructureRepository);

    execute(
        contract: InfrastructureFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<InfrastructureEntity>> {
        return defer(() =>
            this.repository.execute(
                infrastructureFilterEntity(infrastructureFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: InfrastructureCreateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(infrastructureCreateVo(contract))
        );
    }

    update(contract: InfrastructureUpdateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(infrastructureUpdateVo(contract))
        );
    }

    delete(contract: InfrastructureDeleteContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(infrastructureDeleteVo(contract))
        );
    }
}
