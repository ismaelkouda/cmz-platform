import { InfrastructureTypeCreateContract } from '../contracts/infrastructure-type-create.contract';
import { InfrastructureTypeCreateValidateContract } from '../contracts/infrastructure-type-create.validate-contract';
import { validateInfrastructureTypeCreate } from '../validators/infrastructure-type-create.validator';

export function infrastructureTypeCreateVo(
    contract: InfrastructureTypeCreateContract
): InfrastructureTypeCreateValidateContract {
    validateInfrastructureTypeCreate(contract);
    return {
        name: contract.name,
        description: contract.description,
    };
}
