import { GenericRequiredError } from '@cmz/shared-domain';
import { MobileNetworkDisableContract } from '../contracts/mobile-network-disable.contract';
import { MobileNetworkDisableValidateContract } from '../contracts/mobile-network-disable.validate-contract';

export function validateMobileNetworkDisable(
    contract: MobileNetworkDisableContract
): asserts contract is MobileNetworkDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.MOBILE_NETWORK.FORM.ERROR.DISABLE.UNIQ_ID_REQUIRE'
        );
    }
}
