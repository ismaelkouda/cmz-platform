import { assertValidDateRange } from '@cmz/shared-domain';
import { NotificationsFilterContract } from '../contracts/notifications-filter.contract';

export function validateNotificationsFilter(
    contract: NotificationsFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
