import { GenericRequiredError } from '@cmz/shared-domain';
import { HomeDeleteContract } from '../contracts/home-delete.contract';
import { HomeDeleteValidateContract } from '../contracts/home-delete.validate-contract';

export function validateHomeDelete(
    contract: HomeDeleteContract
): asserts contract is HomeDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
