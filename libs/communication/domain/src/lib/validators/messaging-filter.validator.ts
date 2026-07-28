import { assertValidDateRange } from '@cmz/shared-domain';
import { MessagingFilterContract } from '../contracts/messaging-filter.contract';

/**
 * Réutilise `assertValidDateRange` (kernel, `@cmz/shared-domain`) — déjà
 * extrait pour un besoin similaire ailleurs dans le projet, pas de
 * réimplémentation locale de la même règle.
 */
export function validateMessagingFilter(
    contract: MessagingFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
