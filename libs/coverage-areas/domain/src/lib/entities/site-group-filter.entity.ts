import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { SiteGroupFilterContract } from '../contracts/site-group-filter.contract';

export function siteGroupFilterEntity(
    contract: SiteGroupFilterContract
): SiteGroupFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
