import { AdministrativeBoundaryDto, SimpleResponseDto } from '@cmz/shared-data';
import { MessagingChannelApiDto } from './messaging-channel-api.dto';
import { MessagingTargetApiDto } from './messaging-target-api.dto';
import { MessagingTypeApiDto } from './messaging-type-api.dto';

/**
 * `region`/`department`/`municipality` réutilisent `AdministrativeBoundaryDto`
 * (kernel, `@cmz/shared-data`, déjà présent) — reflète fidèlement la forme
 * imbriquée `{id,name,code}` renvoyée par l'API pour le détail.
 */
export interface MessagingFindOneItemApiDto {
    uniq_id: string;
    report_uniq_id: string;
    type: MessagingTypeApiDto;
    target_type: MessagingTargetApiDto;
    region: AdministrativeBoundaryDto | null;
    department: AdministrativeBoundaryDto | null;
    municipality: AdministrativeBoundaryDto | null;
    channels: MessagingChannelApiDto[];
    subject: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export type MessagingFindOneResponseApiDto =
    SimpleResponseDto<MessagingFindOneItemApiDto>;
