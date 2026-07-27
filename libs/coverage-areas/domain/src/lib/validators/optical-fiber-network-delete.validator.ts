import { GenericRequiredError } from '@cmz/shared-domain';
import { OpticalFiberNetworkDeleteContract } from '../contracts/optical-fiber-network-delete.contract';
import { OpticalFiberNetworkDeleteValidateContract } from '../contracts/optical-fiber-network-delete.validate-contract';

export function validateOpticalFiberNetworkDelete(
    contract: OpticalFiberNetworkDeleteContract
): asserts contract is OpticalFiberNetworkDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
