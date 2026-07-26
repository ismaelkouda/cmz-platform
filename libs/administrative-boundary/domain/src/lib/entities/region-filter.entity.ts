import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { RegionFilterContract } from '../contracts/region-filter.contract';

export function regionFilterEntity(
    contract: RegionFilterContract
): RegionFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
