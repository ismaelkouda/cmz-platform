import { MessagingDisableValidateContract } from '../contracts/messaging-disable.validate-contract';
import { validateMessagingDisable } from '../validators/messaging-disable.validator';

export function messagingDisableVo(
    contract: Partial<MessagingDisableValidateContract>
): MessagingDisableValidateContract {
    validateMessagingDisable(contract);
    return contract;
}
