import { GenericRequiredError } from '@cmz/shared-domain';
import { InfrastructureTypeUpdateContract } from '../contracts/infrastructure-type-update.contract';
import { InfrastructureTypeUpdateValidateContract } from '../contracts/infrastructure-type-update.validate-contract';

export function validateInfrastructureTypeUpdate(
    contract: InfrastructureTypeUpdateContract
): asserts contract is InfrastructureTypeUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.FORM.ERROR.UPDATE.NAME_REQUIRE'
        );
    }
    if (!contract.description) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.FORM.ERROR.UPDATE.DESCRIPTION_REQUIRE'
        );
    }
}
