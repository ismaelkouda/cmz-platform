import { SimpleResponseDto } from '@cmz/shared-data';
import { TeamsPermissionNodeApiDto } from './teams-permission-node-api.dto';

/**
 * Pas de champ statut ici (fidèle au source — absent du détail).
 * `id` normalisé en requis (≠ source `id?: string`) : l'entité `find-one`
 * source d'origine est du code mort (`id: string | null` jamais
 * réellement peuplé) — cf. `teams-find-one.props.ts`. Un endpoint
 * "récupérer par id" qui ne trouve rien ne renvoie normalement pas
 * d'item ; `id` optionnel au wire n'avait pas de justification produit.
 */
export interface TeamsFindOneItemApiDto {
    id: string;
    code?: string;
    name?: string;
    description?: string;
    report_types?: string[];
    operators?: string[];
    permissions_json: TeamsPermissionNodeApiDto[];
}

export type TeamsFindOneResponseApiDto =
    SimpleResponseDto<TeamsFindOneItemApiDto>;
