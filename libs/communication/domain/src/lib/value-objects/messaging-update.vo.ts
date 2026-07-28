import { MessagingUpdateContract } from '../contracts/messaging-update.contract';
import { MessagingUpdateValidateContract } from '../contracts/messaging-update.validate-contract';
import { validateMessagingUpdate } from '../validators/messaging-update.validator';

export function messagingUpdateVo(
    contract: MessagingUpdateContract
): MessagingUpdateValidateContract {
    validateMessagingUpdate(contract);
    return contract;
}
