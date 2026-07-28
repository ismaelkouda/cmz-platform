import { GenericRequiredError } from '@cmz/shared-domain';
import { NewsDeleteContract } from '../contracts/news-delete.contract';
import { NewsDeleteValidateContract } from '../contracts/news-delete.validate-contract';

export function validateNewsDelete(
    contract: NewsDeleteContract
): asserts contract is NewsDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.NEWS.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
