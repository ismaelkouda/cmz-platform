import { MessagingEnableValidateContract } from '../contracts/messaging-enable.validate-contract';
import { validateMessagingEnable } from '../validators/messaging-enable.validator';

export function messagingEnableVo(
    contract: Partial<MessagingEnableValidateContract>
): MessagingEnableValidateContract {
    validateMessagingEnable(contract);
    return contract;
}
