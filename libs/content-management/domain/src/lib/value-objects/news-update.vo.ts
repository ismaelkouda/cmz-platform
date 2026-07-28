import { NewsUpdateContract } from '../contracts/news-update.contract';
import { NewsUpdateValidateContract } from '../contracts/news-update.validate-contract';
import { validateNewsUpdate } from '../validators/news-update.validator';

export function newsUpdateVo(
    contract: NewsUpdateContract
): NewsUpdateValidateContract {
    validateNewsUpdate(contract);
    return contract;
}
