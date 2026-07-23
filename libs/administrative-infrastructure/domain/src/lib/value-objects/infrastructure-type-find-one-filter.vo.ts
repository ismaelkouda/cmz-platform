import { InfrastructureTypeFindOneFilterContract } from '../contracts/infrastructure-type-find-one-filter.contract';
import { InfrastructureTypeFindOneFilterValidateContract } from '../contracts/infrastructure-type-find-one-filter.validate-contract';
import { validateInfrastructureTypeFindOneFilter } from '../validators/infrastructure-type-find-one-filter.validator';

export function infrastructureTypeFindOneFilterVo(
    contract: InfrastructureTypeFindOneFilterContract
): InfrastructureTypeFindOneFilterValidateContract {
    validateInfrastructureTypeFindOneFilter(contract);
    return contract;
}
