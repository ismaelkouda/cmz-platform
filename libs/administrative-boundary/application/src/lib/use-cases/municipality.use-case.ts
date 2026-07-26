import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    MunicipalityCreateContract,
    MunicipalityDeleteContract,
    MunicipalityEntity,
    MunicipalityFilterContract,
    MunicipalityRepository,
    MunicipalityUpdateContract,
    municipalityCreateVo,
    municipalityDeleteVo,
    municipalityFilterEntity,
    municipalityFilterVo,
    municipalityUpdateVo,
} from '@cmz/administrative-boundary-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class MunicipalityUseCase {
    private readonly repository = inject(MunicipalityRepository);

    execute(
        contract: MunicipalityFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MunicipalityEntity>> {
        return defer(() =>
            this.repository.execute(
                municipalityFilterEntity(municipalityFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: MunicipalityCreateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(municipalityCreateVo(contract))
        );
    }

    update(contract: MunicipalityUpdateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(municipalityUpdateVo(contract))
        );
    }

    delete(contract: MunicipalityDeleteContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(municipalityDeleteVo(contract))
        );
    }
}
