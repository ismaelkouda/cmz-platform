import { MessagingCreateContract } from '../contracts/messaging-create.contract';
import { MessagingCreateValidateContract } from '../contracts/messaging-create.validate-contract';
import { validateMessagingCreate } from '../validators/messaging-create.validator';

export function messagingCreateVo(
    contract: MessagingCreateContract
): MessagingCreateValidateContract {
    validateMessagingCreate(contract);
    return contract;
}
