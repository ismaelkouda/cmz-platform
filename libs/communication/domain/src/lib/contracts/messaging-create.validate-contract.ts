import { MessagingChannel } from '../enums/messaging-channel.enum';
import { MessagingTarget } from '../enums/messaging-target.enum';
import { MessagingType } from '../enums/messaging-type.enum';

export interface MessagingCreateValidateContract {
    type: MessagingType;
    targetType: MessagingTarget;
    reportId?: string;
    region?: string;
    department?: string;
    municipality?: string;
    channels: MessagingChannel[];
    subject: string;
    content: string;
}
