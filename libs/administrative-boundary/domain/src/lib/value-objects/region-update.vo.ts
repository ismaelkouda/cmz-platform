import { RegionUpdateContract } from '../contracts/region-update.contract';
import { RegionUpdateValidateContract } from '../contracts/region-update.validate-contract';
import { validateRegionUpdate } from '../validators/region-update.validator';

export function regionUpdateVo(
    contract: RegionUpdateContract
): RegionUpdateValidateContract {
    validateRegionUpdate(contract);
    return {
        uniqId: contract.uniqId,
        code: contract.code,
        name: contract.name,
        description: contract.description,
        populationSize: contract.populationSize,
        infrastructureCount: contract.infrastructureCount,
    };
}
