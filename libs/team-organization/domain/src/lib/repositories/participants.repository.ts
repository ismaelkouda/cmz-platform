import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { ParticipantsFilterContract } from '../contracts/participants-filter.contract';
import { ParticipantsCreateValidateContract } from '../contracts/participants-create.validate-contract';
import { ParticipantsUpdateValidateContract } from '../contracts/participants-update.validate-contract';
import { ParticipantsDeleteValidateContract } from '../contracts/participants-delete.validate-contract';
import { ParticipantsEnableValidateContract } from '../contracts/participants-enable.validate-contract';
import { ParticipantsDisableValidateContract } from '../contracts/participants-disable.validate-contract';
import { ParticipantsEntity } from '../entities/participants.entity';

export abstract class ParticipantsRepository {
    abstract execute(
        filter: ParticipantsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<ParticipantsEntity>>;
    abstract create(
        contract: ParticipantsCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: ParticipantsUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: ParticipantsDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        contract: ParticipantsEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        contract: ParticipantsDisableValidateContract
    ): Observable<MessageEntity>;
}
