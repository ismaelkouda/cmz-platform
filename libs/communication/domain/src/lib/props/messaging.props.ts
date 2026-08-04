import { MessagingChannel } from '../enums/messaging-channel.enum';
import { MessagingTarget } from '../enums/messaging-target.enum';
import { MessagingType } from '../enums/messaging-type.enum';

/**
 * Vue liste — `region`/`department`/`municipality` portent le NOM (affichage
 * table), pas l'id (cf. `MessagingFindOneProps` pour le détail, même
 * précédent que `participants.team`/`news.category`). `type`/`targetType`
 * sont ici correctement typés (`MessagingType`/`MessagingTarget`, traduits
 * depuis le wire) — le mapper source laissait ces deux champs en `string`
 * brute sur la liste (jamais passés dans `MessagingTypeMapper`/
 * `MessagingTargetMapper`, contrairement au détail) : bug corrigé ici.
 *
 * Déplacé de `interfaces/messaging-props.interface.ts` vers
 * `props/messaging.props.ts` le 2026-08-04 (backlog #3, uniformisation
 * maximale sur `crud-entity.pattern.json`) — seul le chemin/dossier change,
 * le nom exporté (`MessagingProps`) suivait déjà la convention
 * `{EntityPascal}Props` des 4 modules validés.
 */
export interface MessagingProps {
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
