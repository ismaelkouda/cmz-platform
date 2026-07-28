import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { MessagingFilterContract } from '../contracts/messaging-filter.contract';
import { validateMessagingFilter } from '../validators/messaging-filter.validator';

/**
 * Applique la même règle que le source (`messagingFilterEntity` : une
 * plage ouverte — `startDate` sans `endDate` — se referme sur aujourd'hui)
 * via l'utilitaire kernel déjà extrait (`resolveOpenEndedEndDate`), puis
 * valide la plage résultante.
 */
export function messagingFilterVo(
    contract: MessagingFilterContract
): MessagingFilterContract {
    const resolved: MessagingFilterContract = {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
    validateMessagingFilter(resolved);
    return resolved;
}
