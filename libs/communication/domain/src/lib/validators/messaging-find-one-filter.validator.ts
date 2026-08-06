import { GenericRequiredError } from '@cmz/shared-domain';
import { MessagingFindOneFilterContract } from '../contracts/messaging-find-one-filter.contract';
import { MessagingFindOneFilterValidateContract } from '../contracts/messaging-find-one-filter.validate-contract';

export function validateMessagingFindOneFilter(
    contract: MessagingFindOneFilterContract
): asserts contract is MessagingFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError('Uniq id is required');
    }
}
