import { assertValidDateRange } from '@cmz/shared-domain';
import { AccessLogsFilterContract } from '../contracts/access-logs-filter.contract';

/**
 * Aucun champ requis pour ce filtre — recherche libre + facettes optionnelles.
 */
export function validateAccessLogsFilter(
    contract: AccessLogsFilterContract
): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
