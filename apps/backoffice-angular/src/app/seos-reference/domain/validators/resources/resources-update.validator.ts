import { ResourcesUpdateContract } from '@pages/seos-reference/domain/contracts/resources/resources-update.contract';
import { ResourcesUpdateValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-update.validate-contract';
import { GenericRequiredError } from '@shared/domain/errors/validation/generic.error';

export function validateResourcesUpdate(
    contract: ResourcesUpdateContract
): asserts contract is ResourcesUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'SEOS_REFERENCE.RESOURCES.FORM.ERROR.UPDATE.UNIQID_REQUIRE'
        );
    }
    if (!contract.code) {
        throw new GenericRequiredError(
            'SEOS_REFERENCE.RESOURCES.FORM.ERROR.UPDATE.CODE_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'SEOS_REFERENCE.RESOURCES.FORM.ERROR.UPDATE.NAME_REQUIRE'
        );
    }
    if (!contract.description) {
        throw new GenericRequiredError(
            'SEOS_REFERENCE.RESOURCES.FORM.ERROR.UPDATE.DESCRIPTION_REQUIRE'
        );
    }
}
