import { GenericRequiredError } from '@cmz/shared-domain';
import { SiteGroupDeleteContract } from '../contracts/site-group-delete.contract';
import { SiteGroupDeleteValidateContract } from '../contracts/site-group-delete.validate-contract';

export function validateSiteGroupDelete(
    contract: SiteGroupDeleteContract
): asserts contract is SiteGroupDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.SITE_GROUP.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
