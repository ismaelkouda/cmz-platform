import { ResourcesDeleteContract } from '@pages/seos-reference/domain/contracts/resources/resources-delete.contract';
import { ResourcesDeleteValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-delete.validate-contract';
import { GenericRequiredError } from '@shared/domain/errors/validation/generic.error';

export function validateResourcesDelete(
    contract: ResourcesDeleteContract
): asserts contract is ResourcesDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SEOS_REFERENCE.RESOURCES.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
