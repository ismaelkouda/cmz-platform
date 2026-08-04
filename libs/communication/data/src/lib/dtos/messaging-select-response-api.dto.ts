import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `uniq_id`/`subject` — mêmes champs wire que `MessagingItemApiDto`
 * (confirmé mock-server, `tools/mock-server/domains/communication.mjs`).
 */
export interface MessagingSelectItemApiDto {
    uniq_id: string;
    subject: string;
}

export type MessagingSelectResponseApiDto = SimpleResponseDto<
    MessagingSelectItemApiDto[]
>;
