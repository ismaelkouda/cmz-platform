import { assertValidDateRange } from '@cmz/shared-domain';
import { MobileNetworkFilterContract } from '../contracts/mobile-network-filter.contract';

/**
 * Aucun champ requis pour ce filtre (même décision que `site-group`) — seule
 * contrainte structurelle restante : la plage de dates.
 */
export function validateMobileNetworkFilter(
    contract: MobileNetworkFilterContract
): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
