import { MessagingChannel } from '../enums/messaging-channel.enum';
import { MessagingTarget } from '../enums/messaging-target.enum';
import { MessagingType } from '../enums/messaging-type.enum';

export interface MessagingUpdateValidateContract {
    uniqId: string;
    reportId?: string;
    type: MessagingType;
    targetType: MessagingTarget;
    region?: string;
    department?: string;
    municipality?: string;
    channels: MessagingChannel[];
    subject: string;
    content: string;
}
