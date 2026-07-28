import { NotificationsFilterContract } from '@cmz/communication-domain';
import { NotificationsFilterApiDto } from '../dtos/notifications-filter-api.dto';

export function notificationsFilterMapper(
    contract: NotificationsFilterContract
): NotificationsFilterApiDto {
    const params: NotificationsFilterApiDto = {};
    if (contract.search) {
        params.search = contract.search;
    }
    if (contract.type) {
        params.type = contract.type;
    }
    if (contract.startDate) {
        params.start_date = contract.startDate.toISOString();
    }
    if (contract.endDate) {
        params.end_date = contract.endDate.toISOString();
    }
    return params;
}
