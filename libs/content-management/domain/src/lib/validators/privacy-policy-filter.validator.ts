import { assertValidDateRange } from '@cmz/shared-domain';
import { PrivacyPolicyFilterContract } from '../contracts/privacy-policy-filter.contract';

/**
 * Aucun champ requis pour ce filtre — recherche libre + facettes optionnelles.
 */
export function validatePrivacyPolicyFilter(
    contract: PrivacyPolicyFilterContract
): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
