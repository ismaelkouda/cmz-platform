import { RegionCreateContract } from '../contracts/region-create.contract';
import { RegionCreateValidateContract } from '../contracts/region-create.validate-contract';
import { validateRegionCreate } from '../validators/region-create.validator';

export function regionCreateVo(
    contract: RegionCreateContract
): RegionCreateValidateContract {
    validateRegionCreate(contract);
    return {
        code: contract.code,
        name: contract.name,
        description: contract.description,
        populationSize: contract.populationSize,
        infrastructureCount: contract.infrastructureCount,
    };
}
