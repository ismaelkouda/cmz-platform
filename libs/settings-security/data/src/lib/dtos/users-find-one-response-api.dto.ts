import { SimpleResponseDto } from '@cmz/shared-data';
import { RolesDto } from '@cmz/shared-data';

/**
 * `profile_id` ici (détail) vs `profile` = nom sur la liste — pré-remplit
 * le select du formulaire d'édition. `role` reste `RolesDto | null` fidèle
 * au wire (normalisé vers le `Role` du kernel par `UsersFindOneMapper`,
 * corrigeant l'incohérence du source qui laissait ce champ non traduit).
 */
export interface UsersFindOneItemApiDto {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    profile_id: string;
    role: RolesDto | null;
    created_at?: string;
    updated_at: string;
}

export type UsersFindOneResponseApiDto =
    SimpleResponseDto<UsersFindOneItemApiDto>;
