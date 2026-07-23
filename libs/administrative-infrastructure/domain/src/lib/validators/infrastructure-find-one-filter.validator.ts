import { GenericRequiredError } from '@cmz/shared-domain';
import { InfrastructureFindOneFilterContract } from '../contracts/infrastructure-find-one-filter.contract';
import { InfrastructureFindOneFilterValidateContract } from '../contracts/infrastructure-find-one-filter.validate-contract';

export function validateInfrastructureFindOneFilter(
    contract: InfrastructureFindOneFilterContract
): asserts contract is InfrastructureFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
