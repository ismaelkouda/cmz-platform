import { MobileNetworkFilterContract } from '../contracts/mobile-network-filter.contract';
import { validateMobileNetworkFilter } from '../validators/mobile-network-filter.validator';

export function mobileNetworkFilterVo(
    contract: MobileNetworkFilterContract
): MobileNetworkFilterContract {
    validateMobileNetworkFilter(contract);
    return contract;
}
