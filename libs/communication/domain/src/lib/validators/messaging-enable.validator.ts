import { GenericRequiredError } from '@cmz/shared-domain';
import { MessagingEnableValidateContract } from '../contracts/messaging-enable.validate-contract';

export function validateMessagingEnable(
    contract: Partial<MessagingEnableValidateContract>
): asserts contract is MessagingEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError('Uniq id is required');
    }
}
