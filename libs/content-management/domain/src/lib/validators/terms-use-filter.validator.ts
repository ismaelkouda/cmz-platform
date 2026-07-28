import { assertValidDateRange } from '@cmz/shared-domain';
import { TermsUseFilterContract } from '../contracts/terms-use-filter.contract';

/**
 * Aucun champ requis pour ce filtre — recherche libre + facettes optionnelles.
 */
export function validateTermsUseFilter(contract: TermsUseFilterContract): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
