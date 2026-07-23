import { GenericRequiredError } from '@cmz/shared-domain';
import { InfrastructureUpdateContract } from '../contracts/infrastructure-update.contract';
import { InfrastructureUpdateValidateContract } from '../contracts/infrastructure-update.validate-contract';

export function validateInfrastructureUpdate(
    contract: InfrastructureUpdateContract
): asserts contract is InfrastructureUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.FORM.ERROR.UPDATE.NAME_REQUIRE'
        );
    }
    if (!contract.type) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.FORM.ERROR.UPDATE.TYPE_REQUIRE'
        );
    }
    if (!contract.position) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.FORM.ERROR.UPDATE.POSITION_REQUIRE'
        );
    }
    if (!contract.description) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.FORM.ERROR.UPDATE.DESCRIPTION_REQUIRE'
        );
    }
}
