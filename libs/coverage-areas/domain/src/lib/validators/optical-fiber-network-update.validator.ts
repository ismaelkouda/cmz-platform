import { GenericRequiredError } from '@cmz/shared-domain';
import { OpticalFiberNetworkUpdateContract } from '../contracts/optical-fiber-network-update.contract';
import { OpticalFiberNetworkUpdateValidateContract } from '../contracts/optical-fiber-network-update.validate-contract';

/** `geomFile` volontairement non requis ici (fidèle au source) : re-uploader
 * le tracé n'est pas obligatoire pour une simple mise à jour des métadonnées. */
export function validateOpticalFiberNetworkUpdate(
    contract: OpticalFiberNetworkUpdateContract
): asserts contract is OpticalFiberNetworkUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.UPDATE.NAME_REQUIRE'
        );
    }
    if (!contract.operator) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.UPDATE.OPERATOR_REQUIRE'
        );
    }
    if (!contract.fiberConstructorId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.UPDATE.FIBER_CONSTRUCTOR_REQUIRE'
        );
    }
    if (!contract.type) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.OPTICAL_FIBER_NETWORK.FORM.ERROR.UPDATE.TYPE_REQUIRE'
        );
    }
}
