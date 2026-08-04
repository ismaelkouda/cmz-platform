import { MessagingFindOneFilterContract } from '../contracts/messaging-find-one-filter.contract';
import { MessagingFindOneFilterValidateContract } from '../contracts/messaging-find-one-filter.validate-contract';
import { validateMessagingFindOneFilter } from '../validators/messaging-find-one-filter.validator';

export function messagingFindOneFilterVo(
    contract: MessagingFindOneFilterContract
): MessagingFindOneFilterValidateContract {
    validateMessagingFindOneFilter(contract);
    return contract;
}
