import { GenericRequiredError } from '@cmz/shared-domain';
import { HomeEnableContract } from '../contracts/home-enable.contract';
import { HomeEnableValidateContract } from '../contracts/home-enable.validate-contract';

export function validateHomeEnable(
    contract: HomeEnableContract
): asserts contract is HomeEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.ENABLE.UNIQ_ID_REQUIRE'
        );
    }
}
