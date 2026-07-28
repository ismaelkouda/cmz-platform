import { RolesDto } from '@cmz/shared-data';

/**
 * Champ `phone_number` ici (≠ `phone` en réponse list/find-one) — fidèle
 * à l'incohérence de nommage du wire source, vérifiée avant de conserver
 * (pas une coquille de notre part).
 */
export interface ParticipantsCreateApiDto {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    role?: RolesDto;
    team_uniq_id?: string;
}
