import { GenericRequiredError } from '@cmz/shared-domain';
import { InfrastructureTypeFindOneFilterContract } from '../contracts/infrastructure-type-find-one-filter.contract';
import { InfrastructureTypeFindOneFilterValidateContract } from '../contracts/infrastructure-type-find-one-filter.validate-contract';

export function validateInfrastructureTypeFindOneFilter(
    contract: InfrastructureTypeFindOneFilterContract
): asserts contract is InfrastructureTypeFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
