import { GenericRequiredError } from '@cmz/shared-domain';
import { SiteGroupUpdateContract } from '../contracts/site-group-update.contract';
import { SiteGroupUpdateValidateContract } from '../contracts/site-group-update.validate-contract';

export function validateSiteGroupUpdate(
    contract: SiteGroupUpdateContract
): asserts contract is SiteGroupUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.SITE_GROUP.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.code) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.SITE_GROUP.FORM.ERROR.UPDATE.CODE_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.SITE_GROUP.FORM.ERROR.UPDATE.NAME_REQUIRE'
        );
    }
}
