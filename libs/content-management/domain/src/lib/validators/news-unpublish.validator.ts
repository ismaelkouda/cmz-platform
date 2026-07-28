import { GenericRequiredError } from '@cmz/shared-domain';
import { NewsUnpublishContract } from '../contracts/news-unpublish.contract';
import { NewsUnpublishValidateContract } from '../contracts/news-unpublish.validate-contract';

export function validateNewsUnpublish(
    contract: NewsUnpublishContract
): asserts contract is NewsUnpublishValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.UNPUBLISH.UNIQ_ID_REQUIRE'
        );
    }
}
