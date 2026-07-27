import { GenericRequiredError } from '@cmz/shared-domain';
import { OpticalFiberNetworkDisableContract } from '../contracts/optical-fiber-network-disable.contract';
import { OpticalFiberNetworkDisableValidateContract } from '../contracts/optical-fiber-network-disable.validate-contract';

export function validateOpticalFiberNetworkDisable(
    contract: OpticalFiberNetworkDisableContract
): asserts contract is OpticalFiberNetworkDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.DISABLE.UNIQ_ID_REQUIRE'
        );
    }
}
