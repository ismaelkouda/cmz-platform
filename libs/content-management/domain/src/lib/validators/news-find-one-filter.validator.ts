import { GenericRequiredError } from '@cmz/shared-domain';
import { NewsFindOneFilterContract } from '../contracts/news-find-one-filter.contract';
import { NewsFindOneFilterValidateContract } from '../contracts/news-find-one-filter.validate-contract';

export function validateNewsFindOneFilter(
    contract: NewsFindOneFilterContract
): asserts contract is NewsFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
