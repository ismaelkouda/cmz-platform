import { GenericRequiredError } from '@cmz/shared-domain';
import { HomeDisableContract } from '../contracts/home-disable.contract';
import { HomeDisableValidateContract } from '../contracts/home-disable.validate-contract';

export function validateHomeDisable(
    contract: HomeDisableContract
): asserts contract is HomeDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.DISABLE.UNIQ_ID_REQUIRE'
        );
    }
}
