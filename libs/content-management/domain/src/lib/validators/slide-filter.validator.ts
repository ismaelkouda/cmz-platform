import { assertValidDateRange } from '@cmz/shared-domain';
import { SlideFilterContract } from '../contracts/slide-filter.contract';

/**
 * Aucun champ requis pour ce filtre — recherche libre + facettes optionnelles.
 */
export function validateSlideFilter(contract: SlideFilterContract): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
