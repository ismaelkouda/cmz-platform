import { assertValidDateRange } from '@cmz/shared-domain';
import { RadioRelayLinksFilterContract } from '../contracts/radio-relay-links-filter.contract';

/** Aucun champ requis pour ce filtre (même décision que les 3 entités
 * précédentes) — seule contrainte : la plage de dates. */
export function validateRadioRelayLinksFilter(
    contract: RadioRelayLinksFilterContract
): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
