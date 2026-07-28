import { ReportType, TelecomOperator } from '@cmz/shared-domain';
import { TeamsPermissionOption } from './teams-permission-option.props';

/**
 * Reconstruction volontaire : l'entité `find-one` du source
 * (`TeamsFindOneEntity`) est du code mort/cassé (constructeur positionnel
 * jamais réellement instancié, `id: string | null`). Ici, forme
 * objet-props standard du module, alignée sur le reste de l'archétype —
 * pas de reproduction de l'anti-pattern source. `reportTypes`/`operators`
 * normalisés en tableaux non-optionnels (défaut `[]` au mapping, Phase 3),
 * contrairement au source où ils sont `string[] | undefined`.
 *
 * `ReportType`/`TelecomOperator` réutilisés depuis `@cmz/shared-domain`
 * (déjà présents au kernel, wire-first `'abi'|'zob'|...`/`'mtn'|'orange'|...`)
 * — pas de doublon local (correction : une première version de cette
 * Phase 2 avait recréé ces enums localement avant vérification du kernel).
 */
export interface TeamsFindOneProps {
    uniqId: string;
    code: string | null;
    name: string | null;
    description: string | null;
    reportTypes: ReportType[];
    operators: TelecomOperator[];
    permissions: TeamsPermissionOption[];
}
