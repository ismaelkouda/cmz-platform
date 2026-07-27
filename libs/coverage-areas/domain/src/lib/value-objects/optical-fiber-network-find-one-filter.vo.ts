import { OpticalFiberNetworkFindOneFilterContract } from '../contracts/optical-fiber-network-find-one-filter.contract';
import { OpticalFiberNetworkFindOneFilterValidateContract } from '../contracts/optical-fiber-network-find-one-filter.validate-contract';
import { validateOpticalFiberNetworkFindOneFilter } from '../validators/optical-fiber-network-find-one-filter.validator';

export function opticalFiberNetworkFindOneFilterVo(
    contract: OpticalFiberNetworkFindOneFilterContract
): OpticalFiberNetworkFindOneFilterValidateContract {
    validateOpticalFiberNetworkFindOneFilter(contract);
    return contract;
}
