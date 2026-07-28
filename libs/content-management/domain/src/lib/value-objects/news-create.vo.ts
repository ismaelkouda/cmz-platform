import { NewsCreateContract } from '../contracts/news-create.contract';
import { NewsCreateValidateContract } from '../contracts/news-create.validate-contract';
import { validateNewsCreate } from '../validators/news-create.validator';

/**
 * Pas de transformation de valeur ici (contrairement à home/slide et leur
 * DatePeriod) : le repository consomme directement le ValidateContract.
 */
export function newsCreateVo(
    contract: NewsCreateContract
): NewsCreateValidateContract {
    validateNewsCreate(contract);
    return contract;
}
