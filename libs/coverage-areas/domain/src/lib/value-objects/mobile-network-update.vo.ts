import { MobileNetworkUpdateContract } from '../contracts/mobile-network-update.contract';
import { MobileNetworkUpdateValidateContract } from '../contracts/mobile-network-update.validate-contract';
import { validateMobileNetworkUpdate } from '../validators/mobile-network-update.validator';

export function mobileNetworkUpdateVo(
    contract: MobileNetworkUpdateContract
): MobileNetworkUpdateValidateContract {
    validateMobileNetworkUpdate(contract);
    return contract;
}
