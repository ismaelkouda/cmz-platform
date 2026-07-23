import { InfrastructureTypeFilterContract } from '../contracts/infrastructure-type-filter.contract';
import { validateInfrastructureTypeFilter } from '../validators/infrastructure-type-filter.validator';

export function infrastructureTypeFilterVo(
    contract: InfrastructureTypeFilterContract
): InfrastructureTypeFilterContract {
    validateInfrastructureTypeFilter(contract);
    return contract;
}
