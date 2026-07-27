import { OpticalFiberNetworkFilterContract } from '../contracts/optical-fiber-network-filter.contract';
import { validateOpticalFiberNetworkFilter } from '../validators/optical-fiber-network-filter.validator';

export function opticalFiberNetworkFilterVo(
    contract: OpticalFiberNetworkFilterContract
): OpticalFiberNetworkFilterContract {
    validateOpticalFiberNetworkFilter(contract);
    return contract;
}
