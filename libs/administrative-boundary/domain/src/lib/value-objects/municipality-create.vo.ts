import { MunicipalityCreateContract } from '../contracts/municipality-create.contract';
import { MunicipalityCreateValidateContract } from '../contracts/municipality-create.validate-contract';
import { validateMunicipalityCreate } from '../validators/municipality-create.validator';

export function municipalityCreateVo(
    contract: MunicipalityCreateContract
): MunicipalityCreateValidateContract {
    validateMunicipalityCreate(contract);
    return {
        code: contract.code,
        name: contract.name,
        description: contract.description,
        populationSize: contract.populationSize,
        infrastructureCount: contract.infrastructureCount,
        regionId: contract.regionId,
        departmentId: contract.departmentId,
    };
}
