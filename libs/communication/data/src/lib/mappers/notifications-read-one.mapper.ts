import { NotificationsReadOneValidateContract } from '@cmz/communication-domain';
import { NotificationsReadOneApiDto } from '../dtos/notifications-read-one-api.dto';

export function notificationsReadOneMapper(
    contract: NotificationsReadOneValidateContract
): NotificationsReadOneApiDto {
    return { uniq_id: contract.uniqId };
}
