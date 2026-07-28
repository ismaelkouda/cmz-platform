import { MessagingChannelApiDto } from './messaging-channel-api.dto';
import { MessagingTargetApiDto } from './messaging-target-api.dto';

/**
 * `start_date`/`end_date` en `string` (ISO) — le source les type `Date`
 * sur ce DTO wire, ce qui n'a pas de sens pour un JSON réellement transmis
 * sur le réseau ; corrigé ici, sérialisation faite dans le mapper (même
 * précédent que `access-logs-filter-api.dto.ts`, settings-security).
 */
export interface MessagingFilterApiDto {
    report_id?: string;
    search?: string;
    target_type?: MessagingTargetApiDto;
    region?: string;
    department?: string;
    municipality?: string;
    channels?: MessagingChannelApiDto[];
    start_date?: string;
    end_date?: string;
}
