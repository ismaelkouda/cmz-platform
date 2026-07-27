import { GenericRequiredError } from '@cmz/shared-domain';
import { MobileNetworkEnableContract } from '../contracts/mobile-network-enable.contract';
import { MobileNetworkEnableValidateContract } from '../contracts/mobile-network-enable.validate-contract';

export function validateMobileNetworkEnable(
    contract: MobileNetworkEnableContract
): asserts contract is MobileNetworkEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.MOBILE_NETWORK.FORM.ERROR.ENABLE.UNIQ_ID_REQUIRE'
        );
    }
}
