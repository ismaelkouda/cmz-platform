import { MobileNetworkCreateContract } from '../contracts/mobile-network-create.contract';
import { MobileNetworkCreateValidateContract } from '../contracts/mobile-network-create.validate-contract';
import { validateMobileNetworkCreate } from '../validators/mobile-network-create.validator';

export function mobileNetworkCreateVo(
    contract: MobileNetworkCreateContract
): MobileNetworkCreateValidateContract {
    validateMobileNetworkCreate(contract);
    return contract;
}
