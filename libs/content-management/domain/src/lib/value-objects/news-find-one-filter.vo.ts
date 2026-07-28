import { NewsFindOneFilterContract } from '../contracts/news-find-one-filter.contract';
import { NewsFindOneFilterValidateContract } from '../contracts/news-find-one-filter.validate-contract';
import { validateNewsFindOneFilter } from '../validators/news-find-one-filter.validator';

export function newsFindOneFilterVo(
    contract: NewsFindOneFilterContract
): NewsFindOneFilterValidateContract {
    validateNewsFindOneFilter(contract);
    return contract;
}
