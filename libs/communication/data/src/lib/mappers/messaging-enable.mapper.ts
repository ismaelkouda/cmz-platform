import { MessagingEnableValidateContract } from '@cmz/communication-domain';
import { MessagingEnableApiDto } from '../dtos/messaging-enable-api.dto';

export function messagingEnableMapper(
    contract: MessagingEnableValidateContract
): MessagingEnableApiDto {
    return { uniq_id: contract.uniqId };
}
