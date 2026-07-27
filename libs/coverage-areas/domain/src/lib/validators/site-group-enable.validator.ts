import { GenericRequiredError } from '@cmz/shared-domain';
import { SiteGroupEnableContract } from '../contracts/site-group-enable.contract';
import { SiteGroupEnableValidateContract } from '../contracts/site-group-enable.validate-contract';

export function validateSiteGroupEnable(
    contract: SiteGroupEnableContract
): asserts contract is SiteGroupEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.SITE_GROUP.FORM.ERROR.ENABLE.UNIQ_ID_REQUIRE'
        );
    }
}
