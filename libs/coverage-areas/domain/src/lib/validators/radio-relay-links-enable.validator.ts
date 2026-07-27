import { GenericRequiredError } from '@cmz/shared-domain';
import { RadioRelayLinksEnableContract } from '../contracts/radio-relay-links-enable.contract';
import { RadioRelayLinksEnableValidateContract } from '../contracts/radio-relay-links-enable.validate-contract';

export function validateRadioRelayLinksEnable(
    contract: RadioRelayLinksEnableContract
): asserts contract is RadioRelayLinksEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.ENABLE.UNIQ_ID_REQUIRE'
        );
    }
}
