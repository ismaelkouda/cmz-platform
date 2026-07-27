import { GenericRequiredError } from '@cmz/shared-domain';
import { RadioRelayLinksDisableContract } from '../contracts/radio-relay-links-disable.contract';
import { RadioRelayLinksDisableValidateContract } from '../contracts/radio-relay-links-disable.validate-contract';

export function validateRadioRelayLinksDisable(
    contract: RadioRelayLinksDisableContract
): asserts contract is RadioRelayLinksDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.DISABLE.UNIQ_ID_REQUIRE'
        );
    }
}
