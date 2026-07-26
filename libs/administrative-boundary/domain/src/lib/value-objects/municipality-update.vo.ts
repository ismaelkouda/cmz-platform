import { MunicipalityUpdateContract } from '../contracts/municipality-update.contract';
import { MunicipalityUpdateValidateContract } from '../contracts/municipality-update.validate-contract';
import { validateMunicipalityUpdate } from '../validators/municipality-update.validator';

export function municipalityUpdateVo(
    contract: MunicipalityUpdateContract
): MunicipalityUpdateValidateContract {
    validateMunicipalityUpdate(contract);
    return {
        uniqId: contract.uniqId,
        code: contract.code,
        name: contract.name,
        description: contract.description,
        populationSize: contract.populationSize,
        infrastructureCount: contract.infrastructureCount,
        regionId: contract.regionId,
        departmentId: contract.departmentId,
    };
}
