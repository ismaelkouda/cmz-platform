import { GenericRequiredError, assertValidDateRange } from '@cmz/shared-domain';
import { RadioRelayLinksUpdateContract } from '../contracts/radio-relay-links-update.contract';
import { RadioRelayLinksUpdateValidateContract } from '../contracts/radio-relay-links-update.validate-contract';

export function validateRadioRelayLinksUpdate(
    contract: RadioRelayLinksUpdateContract
): asserts contract is RadioRelayLinksUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.name?.trim()) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.UPDATE.NAME_REQUIRE'
        );
    }
    if (!contract.operator) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.UPDATE.OPERATOR_REQUIRE'
        );
    }
    if (!contract.frequency) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.UPDATE.FREQUENCY_REQUIRE'
        );
    }
    if (!contract.startDate) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.UPDATE.START_DATE_REQUIRE'
        );
    }
    if (!contract.endDate) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.UPDATE.END_DATE_REQUIRE'
        );
    }
    assertValidDateRange(contract.startDate, contract.endDate);
}
