import { SiteGroupDeleteContract } from '../contracts/site-group-delete.contract';
import { SiteGroupDeleteValidateContract } from '../contracts/site-group-delete.validate-contract';
import { validateSiteGroupDelete } from '../validators/site-group-delete.validator';

export function siteGroupDeleteVo(
    contract: SiteGroupDeleteContract
): SiteGroupDeleteValidateContract {
    validateSiteGroupDelete(contract);
    return contract;
}
