import { RegionDeleteContract } from '../contracts/region-delete.contract';
import { RegionDeleteValidateContract } from '../contracts/region-delete.validate-contract';
import { validateRegionDelete } from '../validators/region-delete.validator';

export function regionDeleteVo(
    contract: RegionDeleteContract
): RegionDeleteValidateContract {
    validateRegionDelete(contract);
    return contract;
}
