import { OpticalFiberNetworkDisableContract } from '../contracts/optical-fiber-network-disable.contract';
import { OpticalFiberNetworkDisableValidateContract } from '../contracts/optical-fiber-network-disable.validate-contract';
import { validateOpticalFiberNetworkDisable } from '../validators/optical-fiber-network-disable.validator';

export function opticalFiberNetworkDisableVo(
    contract: OpticalFiberNetworkDisableContract
): OpticalFiberNetworkDisableValidateContract {
    validateOpticalFiberNetworkDisable(contract);
    return contract;
}
