import { assertValidDateRange } from '@cmz/shared-domain';
import { SiteGroupFilterContract } from '../contracts/site-group-filter.contract';

/**
 * Aucun champ requis pour ce filtre (jugé explicitement, cf. contrat) —
 * seule contrainte structurelle restante : la plage de dates.
 */
export function validateSiteGroupFilter(
    contract: SiteGroupFilterContract
): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
