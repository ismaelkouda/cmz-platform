import { assertValidDateRange } from '@cmz/shared-domain';
import { NewsFilterContract } from '../contracts/news-filter.contract';

/**
 * Aucun champ requis pour ce filtre — recherche libre + facettes optionnelles.
 */
export function validateNewsFilter(contract: NewsFilterContract): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
