import { MobileNetworkDeleteContract } from '../contracts/mobile-network-delete.contract';
import { MobileNetworkDeleteValidateContract } from '../contracts/mobile-network-delete.validate-contract';
import { validateMobileNetworkDelete } from '../validators/mobile-network-delete.validator';

export function mobileNetworkDeleteVo(
    contract: MobileNetworkDeleteContract
): MobileNetworkDeleteValidateContract {
    validateMobileNetworkDelete(contract);
    return contract;
}
