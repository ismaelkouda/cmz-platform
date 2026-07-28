import { MessagingDeleteValidateContract } from '../contracts/messaging-delete.validate-contract';
import { validateMessagingDelete } from '../validators/messaging-delete.validator';

export function messagingDeleteVo(
    contract: Partial<MessagingDeleteValidateContract>
): MessagingDeleteValidateContract {
    validateMessagingDelete(contract);
    return contract;
}
