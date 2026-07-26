import { assertValidDateRange } from '@cmz/shared-domain';
import { RegionFilterContract } from '../contracts/region-filter.contract';

/**
 * Aucun champ requis pour ce filtre (jugé explicitement, cf. contrat) —
 * seule contrainte structurelle restante : la plage de dates.
 */
export function validateRegionFilter(contract: RegionFilterContract): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
