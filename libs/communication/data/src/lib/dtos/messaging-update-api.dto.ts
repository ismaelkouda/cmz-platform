import { MessagingChannelApiDto } from './messaging-channel-api.dto';
import { MessagingTargetApiDto } from './messaging-target-api.dto';
import { MessagingTypeApiDto } from './messaging-type-api.dto';

/**
 * Incohérence wire conservée (fidélité au contrat réel, vérifiée dans le
 * source) : `region`/`department`/`municipality` sans suffixe `_id` ici,
 * contrairement à `MessagingCreateApiDto.region_id`/etc. — ce sont bien
 * les mêmes ids, le endpoint `update` les nomme juste différemment du
 * endpoint `store`.
 */
export interface MessagingUpdateApiDto {
    id: string;
    report_uniq_id?: string;
    type: MessagingTypeApiDto;
    target_type: MessagingTargetApiDto;
    region?: string;
    department?: string;
    municipality?: string;
    channels: MessagingChannelApiDto[];
    subject: string;
    content: string;
}
