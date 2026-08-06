import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    TeamsCreateContract,
    TeamsDeleteContract,
    TeamsDisableContract,
    TeamsEnableContract,
    TeamsEntity,
    TeamsFilterContract,
    TeamsRepository,
    TeamsUpdateContract,
    teamsCreateVo,
    teamsDeleteVo,
    teamsDisableVo,
    teamsEnableVo,
    teamsFilterEntity,
    teamsFilterVo,
    teamsUpdateVo,
} from '@cmz/team-organization-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class TeamsUseCase {
    private readonly repository = inject(TeamsRepository);

    execute(
        contract: TeamsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TeamsEntity>> {
        return defer(() =>
            this.repository.execute(
                teamsFilterEntity(teamsFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: TeamsCreateContract): Observable<MessageEntity> {
        return defer(() => this.repository.create(teamsCreateVo(contract)));
    }

    update(contract: TeamsUpdateContract): Observable<MessageEntity> {
        return defer(() => this.repository.update(teamsUpdateVo(contract)));
    }

    delete(contract: TeamsDeleteContract): Observable<MessageEntity> {
        return defer(() => this.repository.delete(teamsDeleteVo(contract)));
    }

    enable(contract: TeamsEnableContract): Observable<MessageEntity> {
        return defer(() => this.repository.enable(teamsEnableVo(contract)));
    }

    disable(contract: TeamsDisableContract): Observable<MessageEntity> {
        return defer(() => this.repository.disable(teamsDisableVo(contract)));
    }
}
