import { GenericRequiredError } from '@cmz/shared-domain';
import { SiteGroupCreateContract } from '../contracts/site-group-create.contract';
import { SiteGroupCreateValidateContract } from '../contracts/site-group-create.validate-contract';

export function validateSiteGroupCreate(
    contract: SiteGroupCreateContract
): asserts contract is SiteGroupCreateValidateContract {
    if (!contract.code) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.SITE_GROUP.FORM.ERROR.CREATE.CODE_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'COVERAGE_AREAS.SITE_GROUP.FORM.ERROR.CREATE.NAME_REQUIRE'
        );
    }
}
