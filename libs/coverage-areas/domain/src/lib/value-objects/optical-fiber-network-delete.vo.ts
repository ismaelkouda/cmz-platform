import { OpticalFiberNetworkDeleteContract } from '../contracts/optical-fiber-network-delete.contract';
import { OpticalFiberNetworkDeleteValidateContract } from '../contracts/optical-fiber-network-delete.validate-contract';
import { validateOpticalFiberNetworkDelete } from '../validators/optical-fiber-network-delete.validator';

export function opticalFiberNetworkDeleteVo(
    contract: OpticalFiberNetworkDeleteContract
): OpticalFiberNetworkDeleteValidateContract {
    validateOpticalFiberNetworkDelete(contract);
    return contract;
}
