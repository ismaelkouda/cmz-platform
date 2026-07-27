import { OpticalFiberNetworkUpdateContract } from '../contracts/optical-fiber-network-update.contract';
import { OpticalFiberNetworkUpdateValidateContract } from '../contracts/optical-fiber-network-update.validate-contract';
import { validateOpticalFiberNetworkUpdate } from '../validators/optical-fiber-network-update.validator';

export function opticalFiberNetworkUpdateVo(
    contract: OpticalFiberNetworkUpdateContract
): OpticalFiberNetworkUpdateValidateContract {
    validateOpticalFiberNetworkUpdate(contract);
    return contract;
}
