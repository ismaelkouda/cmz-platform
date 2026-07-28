import { NewsUnpublishContract } from '../contracts/news-unpublish.contract';
import { NewsUnpublishValidateContract } from '../contracts/news-unpublish.validate-contract';
import { validateNewsUnpublish } from '../validators/news-unpublish.validator';

export function newsUnpublishVo(
    contract: NewsUnpublishContract
): NewsUnpublishValidateContract {
    validateNewsUnpublish(contract);
    return contract;
}
