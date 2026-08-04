import { MessagingChannel } from '../enums/messaging-channel.enum';
import { MessagingTarget } from '../enums/messaging-target.enum';
import { MessagingType } from '../enums/messaging-type.enum';

/**
 * Vue détail — `region`/`department`/`municipality` portent l'ID ici,
 * pré-remplit le cascade de selects en édition (cf. `MessagingProps` pour
 * la liste). Le mapper source dérivait ces ids via
 * `JSON.stringify(dto.region?.id)` — bug réel : `JSON.stringify` sur une
 * string entoure la valeur de guillemets littéraux (`"\"abc\""` au lieu de
 * `"abc"`), cassant tout matching ultérieur contre les options du select.
 * Corrigé côté mapper (`dto.region?.id ?? ''`, pas de `JSON.stringify`).
 *
 * Déplacé de `interfaces/messaging-find-one-props.interface.ts` vers
 * `props/messaging-find-one.props.ts` le 2026-08-04 (backlog #3,
 * uniformisation maximale sur `crud-entity.pattern.json`) — seul le
 * chemin/dossier change, le nom exporté (`MessagingFindOneProps`) suivait
 * déjà la convention `{EntityPascal}FindOneProps` des 4 modules validés.
 */
export interface MessagingFindOneProps {
    uniqId: string;
    reportId: string;
    type: MessagingType;
    targetType: MessagingTarget;
    region: string;
    department: string;
    municipality: string;
    channels: MessagingChannel[];
    subject: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}
