import { NewsPublishContract } from '../contracts/news-publish.contract';
import { NewsPublishValidateContract } from '../contracts/news-publish.validate-contract';
import { validateNewsPublish } from '../validators/news-publish.validator';

export function newsPublishVo(
    contract: NewsPublishContract
): NewsPublishValidateContract {
    validateNewsPublish(contract);
    return contract;
}
