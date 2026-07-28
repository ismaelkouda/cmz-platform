import { MessagingChannelApiDto } from './messaging-channel-api.dto';
import { MessagingTargetApiDto } from './messaging-target-api.dto';
import { MessagingTypeApiDto } from './messaging-type-api.dto';

export interface MessagingCreateApiDto {
    report_uniq_id?: string;
    type: MessagingTypeApiDto;
    target_type: MessagingTargetApiDto;
    region_id?: string;
    department_id?: string;
    municipality_id?: string;
    channels: MessagingChannelApiDto[];
    subject: string;
    content: string;
}
