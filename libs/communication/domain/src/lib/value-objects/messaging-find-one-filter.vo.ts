import { MessagingFindOneFilterValidateContract } from '../contracts/messaging-find-one-filter.validate-contract';
import { validateMessagingFindOneFilter } from '../validators/messaging-find-one-filter.validator';

export function messagingFindOneFilterVo(
    contract: Partial<MessagingFindOneFilterValidateContract>
): MessagingFindOneFilterValidateContract {
    validateMessagingFindOneFilter(contract);
    return contract;
}
