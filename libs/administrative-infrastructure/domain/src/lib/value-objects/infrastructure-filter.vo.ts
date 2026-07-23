import { InfrastructureFilterContract } from '../contracts/infrastructure-filter.contract';
import { validateInfrastructureFilter } from '../validators/infrastructure-filter.validator';

export function infrastructureFilterVo(
    contract: InfrastructureFilterContract
): InfrastructureFilterContract {
    validateInfrastructureFilter(contract);
    return contract;
}
