import { GenericRequiredError, assertValidDateRange } from '@cmz/shared-domain';
import { RadioRelayLinksCreateContract } from '../contracts/radio-relay-links-create.contract';
import { RadioRelayLinksCreateValidateContract } from '../contracts/radio-relay-links-create.validate-contract';

/**
 * Le validateur source (`RadioRelayLinksCreateValidator.assert`) n'exigeait
 * pas explicitement `startDate`/`endDate` avant d'appeler `assertValidDateRange`
 * (qui ne vérifie que l'ordre, pas la présence — cf. son implémentation) alors
 * que le contrat validé les déclare requis. Écart corrigé ici : présence
 * explicitement vérifiée, pas silencieusement reproduite.
 */
export function validateRadioRelayLinksCreate(
    contract: RadioRelayLinksCreateContract
): asserts contract is RadioRelayLinksCreateValidateContract {
    if (!contract.name?.trim()) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.CREATE.NAME_REQUIRE'
        );
    }
    if (!contract.operator) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.CREATE.OPERATOR_REQUIRE'
        );
    }
    if (!contract.frequency) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.CREATE.FREQUENCY_REQUIRE'
        );
    }
    if (!contract.startDate) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.CREATE.START_DATE_REQUIRE'
        );
    }
    if (!contract.endDate) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.RADIO_RELAY_LINKS.FORM.ERROR.CREATE.END_DATE_REQUIRE'
        );
    }
    assertValidDateRange(contract.startDate, contract.endDate);
}
