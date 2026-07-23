import { InfrastructureCreateContract } from '../contracts/infrastructure-create.contract';
import { InfrastructureCreateValidateContract } from '../contracts/infrastructure-create.validate-contract';
import { validateInfrastructureCreate } from '../validators/infrastructure-create.validator';

export function infrastructureCreateVo(
    contract: InfrastructureCreateContract
): InfrastructureCreateValidateContract {
    validateInfrastructureCreate(contract);
    return {
        name: contract.name,
        type: contract.type,
        position: contract.position,
        description: contract.description,
    };
}
