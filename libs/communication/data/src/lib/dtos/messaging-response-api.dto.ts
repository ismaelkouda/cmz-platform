import { PaginatedResponseDto } from '@cmz/shared-data';
import { MessagingChannelApiDto } from './messaging-channel-api.dto';
import { MessagingTargetApiDto } from './messaging-target-api.dto';
import { MessagingTypeApiDto } from './messaging-type-api.dto';

/**
 * `region`/`department`/`municipality` portent le NOM ici (liste) — id
 * sur le détail (`MessagingFindOneItemApiDto`), même précédent que
 * `participants.team`/`news.category`.
 */
export interface MessagingItemApiDto {
    uniq_id: string;
    report_id: string;
    type: MessagingTypeApiDto;
    target_type: MessagingTargetApiDto;
    region: string;
    department: string;
    municipality: string;
    channels: MessagingChannelApiDto[];
    subject: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export type MessagingResponseApiDto = PaginatedResponseDto<MessagingItemApiDto>;
