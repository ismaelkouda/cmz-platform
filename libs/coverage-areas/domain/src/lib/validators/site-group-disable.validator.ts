import { GenericRequiredError } from '@cmz/shared-domain';
import { SiteGroupDisableContract } from '../contracts/site-group-disable.contract';
import { SiteGroupDisableValidateContract } from '../contracts/site-group-disable.validate-contract';

export function validateSiteGroupDisable(
    contract: SiteGroupDisableContract
): asserts contract is SiteGroupDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.SITE_GROUP.FORM.ERROR.DISABLE.UNIQ_ID_REQUIRE'
        );
    }
}
