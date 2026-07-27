import { MobileNetworkEnableContract } from '../contracts/mobile-network-enable.contract';
import { MobileNetworkEnableValidateContract } from '../contracts/mobile-network-enable.validate-contract';
import { validateMobileNetworkEnable } from '../validators/mobile-network-enable.validator';

export function mobileNetworkEnableVo(
    contract: MobileNetworkEnableContract
): MobileNetworkEnableValidateContract {
    validateMobileNetworkEnable(contract);
    return contract;
}
