import { SiteGroupCreateContract } from '../contracts/site-group-create.contract';
import { SiteGroupCreateValidateContract } from '../contracts/site-group-create.validate-contract';
import { validateSiteGroupCreate } from '../validators/site-group-create.validator';

export function siteGroupCreateVo(
    contract: SiteGroupCreateContract
): SiteGroupCreateValidateContract {
    validateSiteGroupCreate(contract);
    return contract;
}
