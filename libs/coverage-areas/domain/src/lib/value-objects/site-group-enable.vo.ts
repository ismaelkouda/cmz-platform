import { SiteGroupEnableContract } from '../contracts/site-group-enable.contract';
import { SiteGroupEnableValidateContract } from '../contracts/site-group-enable.validate-contract';
import { validateSiteGroupEnable } from '../validators/site-group-enable.validator';

export function siteGroupEnableVo(
    contract: SiteGroupEnableContract
): SiteGroupEnableValidateContract {
    validateSiteGroupEnable(contract);
    return contract;
}
