import { GenericRequiredError } from '@cmz/shared-domain';
import { MessagingFindOneFilterValidateContract } from '../contracts/messaging-find-one-filter.validate-contract';

export function validateMessagingFindOneFilter(
    contract: Partial<MessagingFindOneFilterValidateContract>
): asserts contract is MessagingFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError('Uniq id is required');
    }
}
