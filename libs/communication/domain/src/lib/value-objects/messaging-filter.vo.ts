import { MessagingFilterContract } from '../contracts/messaging-filter.contract';
import { validateMessagingFilter } from '../validators/messaging-filter.validator';

/**
 * Valide le contrat brut (`assertValidDateRange` — ne lève que si les deux
 * bornes sont déjà définies et incohérentes). La résolution de la plage
 * ouverte (`startDate` sans `endDate` → aujourd'hui) ne vit plus ici depuis
 * le 2026-08-04 (backlog #3) : déplacée vers `messagingFilterEntity`, pour
 * aligner ce module sur le même partage de responsabilité VO/entity que
 * les 4 modules déjà validés par `crud-entity.pattern.json`
 * (`infrastructureFilterVo`/`regionFilterVo` ne font eux aussi que
 * valider). Équivalence comportementale vérifiée avant ce déplacement —
 * voir le commentaire de `messaging-filter.entity.ts`.
 */
export function messagingFilterVo(
    contract: MessagingFilterContract
): MessagingFilterContract {
    validateMessagingFilter(contract);
    return contract;
}
