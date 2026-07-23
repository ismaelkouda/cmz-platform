import { GenericRequiredError } from '@cmz/shared-domain';
import { InfrastructureDeleteContract } from '../contracts/infrastructure-delete.contract';
import { InfrastructureDeleteValidateContract } from '../contracts/infrastructure-delete.validate-contract';

export function validateInfrastructureDelete(
    contract: InfrastructureDeleteContract
): asserts contract is InfrastructureDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
