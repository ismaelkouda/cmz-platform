import { OpticalFiberNetworkCreateContract } from '../contracts/optical-fiber-network-create.contract';
import { OpticalFiberNetworkCreateValidateContract } from '../contracts/optical-fiber-network-create.validate-contract';
import { validateOpticalFiberNetworkCreate } from '../validators/optical-fiber-network-create.validator';

export function opticalFiberNetworkCreateVo(
    contract: OpticalFiberNetworkCreateContract
): OpticalFiberNetworkCreateValidateContract {
    validateOpticalFiberNetworkCreate(contract);
    return contract;
}
