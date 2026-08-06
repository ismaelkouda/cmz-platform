import { MessagingDeleteContract } from '../contracts/messaging-delete.contract';
import { MessagingDeleteValidateContract } from '../contracts/messaging-delete.validate-contract';
import { validateMessagingDelete } from '../validators/messaging-delete.validator';

export function messagingDeleteVo(
    contract: MessagingDeleteContract
): MessagingDeleteValidateContract {
    validateMessagingDelete(contract);
    return contract;
}
