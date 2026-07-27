import { GenericRequiredError } from '@cmz/shared-domain';
import { RadioRelayLinksFindOneFilterContract } from '../contracts/radio-relay-links-find-one-filter.contract';
import { RadioRelayLinksFindOneFilterValidateContract } from '../contracts/radio-relay-links-find-one-filter.validate-contract';

export function validateRadioRelayLinksFindOneFilter(
    contract: RadioRelayLinksFindOneFilterContract
): asserts contract is RadioRelayLinksFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
