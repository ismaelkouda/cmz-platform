import { assertValidDateRange } from '@cmz/shared-domain';
import { HomeFilterContract } from '../contracts/home-filter.contract';

/**
 * Aucun champ requis pour ce filtre — recherche libre + facettes optionnelles.
 */
export function validateHomeFilter(contract: HomeFilterContract): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
