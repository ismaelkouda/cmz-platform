import { OpticalFiberNetworkEnableContract } from '../contracts/optical-fiber-network-enable.contract';
import { OpticalFiberNetworkEnableValidateContract } from '../contracts/optical-fiber-network-enable.validate-contract';
import { validateOpticalFiberNetworkEnable } from '../validators/optical-fiber-network-enable.validator';

export function opticalFiberNetworkEnableVo(
    contract: OpticalFiberNetworkEnableContract
): OpticalFiberNetworkEnableValidateContract {
    validateOpticalFiberNetworkEnable(contract);
    return contract;
}
