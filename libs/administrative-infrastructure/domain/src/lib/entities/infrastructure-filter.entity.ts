import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { InfrastructureFilterContract } from '../contracts/infrastructure-filter.contract';

export function infrastructureFilterEntity(
    contract: InfrastructureFilterContract
): InfrastructureFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
