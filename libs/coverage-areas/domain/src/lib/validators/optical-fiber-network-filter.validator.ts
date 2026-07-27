import { assertValidDateRange } from '@cmz/shared-domain';
import { OpticalFiberNetworkFilterContract } from '../contracts/optical-fiber-network-filter.contract';

/**
 * Aucun champ requis pour ce filtre (même décision que `site-group`/
 * `mobile-network`) — seule contrainte structurelle : la plage de dates.
 */
export function validateOpticalFiberNetworkFilter(
    contract: OpticalFiberNetworkFilterContract
): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
