import { GenericRequiredError } from '@cmz/shared-domain';
import { MobileNetworkDeleteContract } from '../contracts/mobile-network-delete.contract';
import { MobileNetworkDeleteValidateContract } from '../contracts/mobile-network-delete.validate-contract';

export function validateMobileNetworkDelete(
    contract: MobileNetworkDeleteContract
): asserts contract is MobileNetworkDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.MOBILE_NETWORK.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
