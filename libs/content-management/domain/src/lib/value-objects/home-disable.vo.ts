import { HomeDisableContract } from '../contracts/home-disable.contract';
import { HomeDisableValidateContract } from '../contracts/home-disable.validate-contract';
import { validateHomeDisable } from '../validators/home-disable.validator';

export function homeDisableVo(
    contract: HomeDisableContract
): HomeDisableValidateContract {
    validateHomeDisable(contract);
    return contract;
}
