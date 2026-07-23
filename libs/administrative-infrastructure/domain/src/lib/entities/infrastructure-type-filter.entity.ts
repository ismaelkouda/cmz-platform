import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { InfrastructureTypeFilterContract } from '../contracts/infrastructure-type-filter.contract';

export function infrastructureTypeFilterEntity(
    contract: InfrastructureTypeFilterContract
): InfrastructureTypeFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
