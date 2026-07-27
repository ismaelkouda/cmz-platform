import { GenericRequiredError } from '@cmz/shared-domain';
import { OpticalFiberNetworkEnableContract } from '../contracts/optical-fiber-network-enable.contract';
import { OpticalFiberNetworkEnableValidateContract } from '../contracts/optical-fiber-network-enable.validate-contract';

export function validateOpticalFiberNetworkEnable(
    contract: OpticalFiberNetworkEnableContract
): asserts contract is OpticalFiberNetworkEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.ENABLE.UNIQ_ID_REQUIRE'
        );
    }
}
