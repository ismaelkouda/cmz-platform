import { NewsFilterContract } from '../contracts/news-filter.contract';
import { validateNewsFilter } from '../validators/news-filter.validator';

export function newsFilterVo(contract: NewsFilterContract): NewsFilterContract {
    validateNewsFilter(contract);
    return contract;
}
