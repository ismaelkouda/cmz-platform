import { RadioRelayLinksFilterContract } from '../contracts/radio-relay-links-filter.contract';
import { validateRadioRelayLinksFilter } from '../validators/radio-relay-links-filter.validator';

export function radioRelayLinksFilterVo(
    contract: RadioRelayLinksFilterContract
): RadioRelayLinksFilterContract {
    validateRadioRelayLinksFilter(contract);
    return contract;
}
