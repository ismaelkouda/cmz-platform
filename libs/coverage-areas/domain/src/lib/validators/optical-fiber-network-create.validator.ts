import { GenericRequiredError } from '@cmz/shared-domain';
import { OpticalFiberNetworkCreateContract } from '../contracts/optical-fiber-network-create.contract';
import { OpticalFiberNetworkCreateValidateContract } from '../contracts/optical-fiber-network-create.validate-contract';

export function validateOpticalFiberNetworkCreate(
    contract: OpticalFiberNetworkCreateContract
): asserts contract is OpticalFiberNetworkCreateValidateContract {
    if (!contract.name) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.CREATE.NAME_REQUIRE'
        );
    }
    if (!contract.operator) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.CREATE.OPERATOR_REQUIRE'
        );
    }
    if (!contract.fiberConstructorId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.CREATE.FIBER_CONSTRUCTOR_REQUIRE'
        );
    }
    if (!contract.type) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.CREATE.TYPE_REQUIRE'
        );
    }
    if (!contract.geomFile) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.CREATE.GEOM_FILE_REQUIRE'
        );
    }
}
