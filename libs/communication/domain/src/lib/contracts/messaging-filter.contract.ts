import { MessagingChannel } from '../enums/messaging-channel.enum';
import { MessagingTarget } from '../enums/messaging-target.enum';

export interface MessagingFilterContract {
    reportId?: string;
    search?: string;
    targetType?: MessagingTarget;
    region?: string;
    department?: string;
    municipality?: string;
    channels?: MessagingChannel[];
    startDate?: Date;
    endDate?: Date;
}
