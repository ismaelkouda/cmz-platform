import { GenericRequiredError } from '@cmz/shared-domain';
import { InfrastructureTypeDeleteContract } from '../contracts/infrastructure-type-delete.contract';
import { InfrastructureTypeDeleteValidateContract } from '../contracts/infrastructure-type-delete.validate-contract';

export function validateInfrastructureTypeDelete(
    contract: InfrastructureTypeDeleteContract
): asserts contract is InfrastructureTypeDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
