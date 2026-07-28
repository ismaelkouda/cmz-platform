import { NotificationsReadOneValidateContract } from '../contracts/notifications-read-one.validate-contract';
import { validateNotificationsReadOne } from '../validators/notifications-read-one.validator';

export function notificationsReadOneVo(
    contract: Partial<NotificationsReadOneValidateContract>
): NotificationsReadOneValidateContract {
    validateNotificationsReadOne(contract);
    return contract;
}
