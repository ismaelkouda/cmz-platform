import { MobileNetworkFindOneFilterContract } from '../contracts/mobile-network-find-one-filter.contract';
import { MobileNetworkFindOneFilterValidateContract } from '../contracts/mobile-network-find-one-filter.validate-contract';
import { validateMobileNetworkFindOneFilter } from '../validators/mobile-network-find-one-filter.validator';

export function mobileNetworkFindOneFilterVo(
    contract: MobileNetworkFindOneFilterContract
): MobileNetworkFindOneFilterValidateContract {
    validateMobileNetworkFindOneFilter(contract);
    return contract;
}
