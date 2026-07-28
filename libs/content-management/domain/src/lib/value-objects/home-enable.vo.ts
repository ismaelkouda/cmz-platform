import { HomeEnableContract } from '../contracts/home-enable.contract';
import { HomeEnableValidateContract } from '../contracts/home-enable.validate-contract';
import { validateHomeEnable } from '../validators/home-enable.validator';

export function homeEnableVo(
    contract: HomeEnableContract
): HomeEnableValidateContract {
    validateHomeEnable(contract);
    return contract;
}
