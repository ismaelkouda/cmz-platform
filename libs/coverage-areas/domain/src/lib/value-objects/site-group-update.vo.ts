import { SiteGroupUpdateContract } from '../contracts/site-group-update.contract';
import { SiteGroupUpdateValidateContract } from '../contracts/site-group-update.validate-contract';
import { validateSiteGroupUpdate } from '../validators/site-group-update.validator';

export function siteGroupUpdateVo(
    contract: SiteGroupUpdateContract
): SiteGroupUpdateValidateContract {
    validateSiteGroupUpdate(contract);
    return contract;
}
