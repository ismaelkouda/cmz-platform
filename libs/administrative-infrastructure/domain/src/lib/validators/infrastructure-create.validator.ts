import { GenericRequiredError } from '@cmz/shared-domain';
import { InfrastructureCreateContract } from '../contracts/infrastructure-create.contract';
import { InfrastructureCreateValidateContract } from '../contracts/infrastructure-create.validate-contract';

export function validateInfrastructureCreate(
    contract: InfrastructureCreateContract
): asserts contract is InfrastructureCreateValidateContract {
    if (!contract.name) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.FORM.ERROR.CREATE.NAME_REQUIRE'
        );
    }
    if (!contract.type) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.FORM.ERROR.CREATE.TYPE_REQUIRE'
        );
    }
    if (!contract.position) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.FORM.ERROR.CREATE.POSITION_REQUIRE'
        );
    }
    if (!contract.description) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.FORM.ERROR.CREATE.DESCRIPTION_REQUIRE'
        );
    }
}
