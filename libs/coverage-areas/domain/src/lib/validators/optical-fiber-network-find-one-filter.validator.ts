import { GenericRequiredError } from '@cmz/shared-domain';
import { OpticalFiberNetworkFindOneFilterContract } from '../contracts/optical-fiber-network-find-one-filter.contract';
import { OpticalFiberNetworkFindOneFilterValidateContract } from '../contracts/optical-fiber-network-find-one-filter.validate-contract';

export function validateOpticalFiberNetworkFindOneFilter(
    contract: OpticalFiberNetworkFindOneFilterContract
): asserts contract is OpticalFiberNetworkFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
