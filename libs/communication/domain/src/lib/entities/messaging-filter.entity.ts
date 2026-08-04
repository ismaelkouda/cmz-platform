import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { MessagingFilterContract } from '../contracts/messaging-filter.contract';

/**
 * Étape « entité de filtre » du pattern crud-entity (cœur canonique,
 * `docs/architecture/patterns/crud-entity.pattern.json`), manquante ici
 * jusqu'au 2026-08-04 (backlog #3, cartographie) — vérifié fichier par
 * fichier via `check-pattern-nx.mjs`, 54/66 (81.8%) avant ce correctif.
 *
 * Divergence réelle trouvée avant d'écrire ce fichier : contrairement aux
 * 4 modules déjà validés (`administrative-infrastructure`/
 * `administrative-boundary`/`coverage-areas`/`team-organization`), où
 * `resolveOpenEndedEndDate` vit uniquement dans la filter-entity et le VO
 * ne fait QUE valider, `messagingFilterVo` avait déjà absorbé cette
 * résolution en plus de sa validation (deux responsabilités dans la même
 * fonction). Recréer la filter-entity en dupliquant l'appel aurait
 * introduit une double résolution redondante (inoffensive car
 * `resolveOpenEndedEndDate` est idempotente — elle ne touche `endDate` que
 * s'il est `undefined` — mais malhonnête architecturalement : deux couches
 * qui prétendent chacune faire le travail). Corrigé à la source à la place
 * : la résolution est retirée de `messagingFilterVo` (qui ne fait plus que
 * valider, comme `infrastructureFilterVo`/`regionFilterVo`) et déplacée
 * ici. Équivalence comportementale vérifiée avant le déplacement :
 * `assertValidDateRange` ne lève que si les deux bornes sont déjà définies
 * (`startDate.getTime() > endDate.getTime()`), donc valider le contrat brut
 * avant résolution (nouvel ordre : VO valide, puis cette entité résout)
 * produit exactement les mêmes rejets et la même plage finale que l'ancien
 * ordre (VO résout puis valide) — pas une supposition, une lecture des deux
 * fonctions kernel (`resolve-open-ended-end-date.util.ts`,
 * `assert-valid-date-range.validator.ts`).
 */
export function messagingFilterEntity(
    contract: MessagingFilterContract
): MessagingFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
