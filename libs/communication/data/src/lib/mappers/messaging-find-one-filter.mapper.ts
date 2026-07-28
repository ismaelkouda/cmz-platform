import { MessagingFindOneFilterValidateContract } from '@cmz/communication-domain';
import { MessagingFindOneFilterApiDto } from '../dtos/messaging-find-one-filter-api.dto';

export function messagingFindOneFilterMapper(
    contract: MessagingFindOneFilterValidateContract
): MessagingFindOneFilterApiDto {
    return { id: contract.uniqId };
}
