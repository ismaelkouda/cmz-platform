import { Service } from '@angular/core';
import { NotificationsStatus } from '@cmz/communication-domain';
import { NotificationsStatusApiDto } from '../dtos/notifications-status-api.dto';

@Service()
export class NotificationsStatusMapper {
    private readonly dtoToDomain: Record<
        NotificationsStatusApiDto,
        NotificationsStatus
    > = {
        read: NotificationsStatus.READ,
        unread: NotificationsStatus.UNREAD,
    };

    mapFromDto(dto: NotificationsStatusApiDto): NotificationsStatus {
        return this.dtoToDomain[dto];
    }
}
