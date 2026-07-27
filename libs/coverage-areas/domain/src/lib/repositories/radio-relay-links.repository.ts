import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { RadioRelayLinksFilterContract } from '../contracts/radio-relay-links-filter.contract';
import { RadioRelayLinksCreateValidateContract } from '../contracts/radio-relay-links-create.validate-contract';
import { RadioRelayLinksUpdateValidateContract } from '../contracts/radio-relay-links-update.validate-contract';
import { RadioRelayLinksDeleteValidateContract } from '../contracts/radio-relay-links-delete.validate-contract';
import { RadioRelayLinksEnableValidateContract } from '../contracts/radio-relay-links-enable.validate-contract';
import { RadioRelayLinksDisableValidateContract } from '../contracts/radio-relay-links-disable.validate-contract';
import { RadioRelayLinksEntity } from '../entities/radio-relay-links.entity';

export abstract class RadioRelayLinksRepository {
    abstract execute(
        filter: RadioRelayLinksFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<RadioRelayLinksEntity>>;
    abstract create(
        contract: RadioRelayLinksCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: RadioRelayLinksUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: RadioRelayLinksDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        contract: RadioRelayLinksEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        contract: RadioRelayLinksDisableValidateContract
    ): Observable<MessageEntity>;
}
