import { GenericRequiredError } from '@cmz/shared-domain';
import { MobileNetworkFindOneFilterContract } from '../contracts/mobile-network-find-one-filter.contract';
import { MobileNetworkFindOneFilterValidateContract } from '../contracts/mobile-network-find-one-filter.validate-contract';

export function validateMobileNetworkFindOneFilter(
    contract: MobileNetworkFindOneFilterContract
): asserts contract is MobileNetworkFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.MOBILE_NETWORK.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
