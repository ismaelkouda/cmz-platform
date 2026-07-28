import { NewsDeleteContract } from '../contracts/news-delete.contract';
import { NewsDeleteValidateContract } from '../contracts/news-delete.validate-contract';
import { validateNewsDelete } from '../validators/news-delete.validator';

export function newsDeleteVo(
    contract: NewsDeleteContract
): NewsDeleteValidateContract {
    validateNewsDelete(contract);
    return contract;
}
