import { GenericRequiredError } from '@cmz/shared-domain';
import { NewsPublishContract } from '../contracts/news-publish.contract';
import { NewsPublishValidateContract } from '../contracts/news-publish.validate-contract';

export function validateNewsPublish(
    contract: NewsPublishContract
): asserts contract is NewsPublishValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.PUBLISH.UNIQ_ID_REQUIRE'
        );
    }
}
