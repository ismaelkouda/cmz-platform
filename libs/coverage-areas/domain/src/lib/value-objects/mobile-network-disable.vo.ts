import { MobileNetworkDisableContract } from '../contracts/mobile-network-disable.contract';
import { MobileNetworkDisableValidateContract } from '../contracts/mobile-network-disable.validate-contract';
import { validateMobileNetworkDisable } from '../validators/mobile-network-disable.validator';

export function mobileNetworkDisableVo(
    contract: MobileNetworkDisableContract
): MobileNetworkDisableValidateContract {
    validateMobileNetworkDisable(contract);
    return contract;
}
