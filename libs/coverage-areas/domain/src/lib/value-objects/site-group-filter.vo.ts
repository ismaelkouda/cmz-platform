import { SiteGroupFilterContract } from '../contracts/site-group-filter.contract';
import { validateSiteGroupFilter } from '../validators/site-group-filter.validator';

export function siteGroupFilterVo(
    contract: SiteGroupFilterContract
): SiteGroupFilterContract {
    validateSiteGroupFilter(contract);
    return contract;
}
