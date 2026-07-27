import { GenericRequiredError } from '@cmz/shared-domain';
import { RadioRelayLinksDeleteContract } from '../contracts/radio-relay-links-delete.contract';
import { RadioRelayLinksDeleteValidateContract } from '../contracts/radio-relay-links-delete.validate-contract';

export function validateRadioRelayLinksDelete(
    contract: RadioRelayLinksDeleteContract
): asserts contract is RadioRelayLinksDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
