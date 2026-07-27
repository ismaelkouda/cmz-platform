import { GenericRequiredError } from '@cmz/shared-domain';
import { SiteGroupFindOneFilterContract } from '../contracts/site-group-find-one-filter.contract';
import { SiteGroupFindOneFilterValidateContract } from '../contracts/site-group-find-one-filter.validate-contract';

export function validateSiteGroupFindOneFilter(
    contract: SiteGroupFindOneFilterContract
): asserts contract is SiteGroupFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.SITE_GROUP.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
