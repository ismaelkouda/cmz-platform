import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    ParticipantsCreateContract,
    ParticipantsDeleteContract,
    ParticipantsDisableContract,
    ParticipantsEnableContract,
    ParticipantsEntity,
    ParticipantsFilterContract,
    ParticipantsRepository,
    ParticipantsUpdateContract,
    participantsCreateVo,
    participantsDeleteVo,
    participantsDisableVo,
    participantsEnableVo,
    participantsFilterEntity,
    participantsFilterVo,
    participantsUpdateVo,
} from '@cmz/team-organization-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class ParticipantsUseCase {
    private readonly repository = inject(ParticipantsRepository);

    execute(
        contract: ParticipantsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<ParticipantsEntity>> {
        return defer(() =>
            this.repository.execute(
                participantsFilterEntity(participantsFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: ParticipantsCreateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(participantsCreateVo(contract))
        );
    }

    update(contract: ParticipantsUpdateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(participantsUpdateVo(contract))
        );
    }

    delete(contract: ParticipantsDeleteContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(participantsDeleteVo(contract))
        );
    }

    enable(contract: ParticipantsEnableContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.enable(participantsEnableVo(contract))
        );
    }

    disable(contract: ParticipantsDisableContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.disable(participantsDisableVo(contract))
        );
    }
}
