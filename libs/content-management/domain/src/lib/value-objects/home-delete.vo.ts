import { HomeDeleteContract } from '../contracts/home-delete.contract';
import { HomeDeleteValidateContract } from '../contracts/home-delete.validate-contract';
import { validateHomeDelete } from '../validators/home-delete.validator';

export function homeDeleteVo(
    contract: HomeDeleteContract
): HomeDeleteValidateContract {
    validateHomeDelete(contract);
    return contract;
}
