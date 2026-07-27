import { SiteGroupDisableContract } from '../contracts/site-group-disable.contract';
import { SiteGroupDisableValidateContract } from '../contracts/site-group-disable.validate-contract';
import { validateSiteGroupDisable } from '../validators/site-group-disable.validator';

export function siteGroupDisableVo(
    contract: SiteGroupDisableContract
): SiteGroupDisableValidateContract {
    validateSiteGroupDisable(contract);
    return contract;
}
