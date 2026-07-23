import { InfrastructureTypeUpdateContract } from '../contracts/infrastructure-type-update.contract';
import { InfrastructureTypeUpdateValidateContract } from '../contracts/infrastructure-type-update.validate-contract';
import { validateInfrastructureTypeUpdate } from '../validators/infrastructure-type-update.validator';

export function infrastructureTypeUpdateVo(
    contract: InfrastructureTypeUpdateContract
): InfrastructureTypeUpdateValidateContract {
    validateInfrastructureTypeUpdate(contract);
    return {
        uniqId: contract.uniqId,
        name: contract.name,
        description: contract.description,
    };
}
