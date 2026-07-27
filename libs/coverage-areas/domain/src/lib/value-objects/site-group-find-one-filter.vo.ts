import { SiteGroupFindOneFilterContract } from '../contracts/site-group-find-one-filter.contract';
import { SiteGroupFindOneFilterValidateContract } from '../contracts/site-group-find-one-filter.validate-contract';
import { validateSiteGroupFindOneFilter } from '../validators/site-group-find-one-filter.validator';

export function siteGroupFindOneFilterVo(
    contract: SiteGroupFindOneFilterContract
): SiteGroupFindOneFilterValidateContract {
    validateSiteGroupFindOneFilter(contract);
    return contract;
}
