import { GenericRequiredError } from '@cmz/shared-domain';
import { InfrastructureTypeCreateContract } from '../contracts/infrastructure-type-create.contract';
import { InfrastructureTypeCreateValidateContract } from '../contracts/infrastructure-type-create.validate-contract';

export function validateInfrastructureTypeCreate(
    contract: InfrastructureTypeCreateContract
): asserts contract is InfrastructureTypeCreateValidateContract {
    if (!contract.name) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.FORM.ERROR.CREATE.NAME_REQUIRE'
        );
    }
    if (!contract.description) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.FORM.ERROR.CREATE.DESCRIPTION_REQUIRE'
        );
    }
}
