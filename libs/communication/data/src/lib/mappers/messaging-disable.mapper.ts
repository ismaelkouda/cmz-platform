import { MessagingDisableValidateContract } from '@cmz/communication-domain';
import { MessagingDisableApiDto } from '../dtos/messaging-disable-api.dto';

export function messagingDisableMapper(
    contract: MessagingDisableValidateContract
): MessagingDisableApiDto {
    return { uniq_id: contract.uniqId };
}
