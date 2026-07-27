import { RadioRelayLinksFindOneFilterContract } from '../contracts/radio-relay-links-find-one-filter.contract';
import { RadioRelayLinksFindOneFilterValidateContract } from '../contracts/radio-relay-links-find-one-filter.validate-contract';
import { validateRadioRelayLinksFindOneFilter } from '../validators/radio-relay-links-find-one-filter.validator';

export function radioRelayLinksFindOneFilterVo(
    contract: RadioRelayLinksFindOneFilterContract
): RadioRelayLinksFindOneFilterValidateContract {
    validateRadioRelayLinksFindOneFilter(contract);
    return contract;
}
