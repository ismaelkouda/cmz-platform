import { ResourcesFindOneFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-find-one-filter.contract';
import { ResourcesFindOneFilterValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-find-one-filter.validate-contract';
import { GenericRequiredError } from '@shared/domain/errors/validation/generic.error';

export function validateResourcesFindOneFilter(
    contract: ResourcesFindOneFilterContract
): asserts contract is ResourcesFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SEOS_REFERENCE.RESOURCES.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
