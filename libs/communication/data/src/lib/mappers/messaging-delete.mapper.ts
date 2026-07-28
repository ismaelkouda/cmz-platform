import { MessagingDeleteValidateContract } from '@cmz/communication-domain';
import { MessagingDeleteApiDto } from '../dtos/messaging-delete-api.dto';

export function messagingDeleteMapper(
    contract: MessagingDeleteValidateContract
): MessagingDeleteApiDto {
    return { uniq_id: contract.uniqId };
}
