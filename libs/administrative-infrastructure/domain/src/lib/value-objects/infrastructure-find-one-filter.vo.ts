import { InfrastructureFindOneFilterContract } from '../contracts/infrastructure-find-one-filter.contract';
import { InfrastructureFindOneFilterValidateContract } from '../contracts/infrastructure-find-one-filter.validate-contract';
import { validateInfrastructureFindOneFilter } from '../validators/infrastructure-find-one-filter.validator';

export function infrastructureFindOneFilterVo(
    contract: InfrastructureFindOneFilterContract
): InfrastructureFindOneFilterValidateContract {
    validateInfrastructureFindOneFilter(contract);
    return contract;
}
