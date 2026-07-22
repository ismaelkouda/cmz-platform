import { ResourcesCreateContract } from '@pages/seos-reference/domain/contracts/resources/resources-create.contract';
import { ResourcesCreateValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-create.validate-contract';
import { GenericRequiredError } from '@shared/domain/errors/validation/generic.error';

export function validateResourcesCreate(
    contract: ResourcesCreateContract
): asserts contract is ResourcesCreateValidateContract {
    if (!contract.code) {
        throw new GenericRequiredError(
            'SEOS_REFERENCE.RESOURCES.FORM.ERROR.CREATE.CODE_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'SEOS_REFERENCE.RESOURCES.FORM.ERROR.CREATE.NAME_REQUIRE'
        );
    }
    if (!contract.description) {
        throw new GenericRequiredError(
            'SEOS_REFERENCE.RESOURCES.FORM.ERROR.CREATE.DESCRIPTION_REQUIRE'
        );
    }
}
