import { assertValidDateRange } from '@cmz/shared-domain';
import { LegalNoticeFilterContract } from '../contracts/legal-notice-filter.contract';

/**
 * Aucun champ requis pour ce filtre — recherche libre + facettes optionnelles.
 */
export function validateLegalNoticeFilter(
    contract: LegalNoticeFilterContract
): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
