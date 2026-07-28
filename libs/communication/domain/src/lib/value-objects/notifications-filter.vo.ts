import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { NotificationsFilterContract } from '../contracts/notifications-filter.contract';
import { validateNotificationsFilter } from '../validators/notifications-filter.validator';

export function notificationsFilterVo(
    contract: NotificationsFilterContract
): NotificationsFilterContract {
    const resolved: NotificationsFilterContract = {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
    validateNotificationsFilter(resolved);
    return resolved;
}
