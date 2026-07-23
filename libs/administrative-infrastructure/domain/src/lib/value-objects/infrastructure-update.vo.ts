import { InfrastructureUpdateContract } from '../contracts/infrastructure-update.contract';
import { InfrastructureUpdateValidateContract } from '../contracts/infrastructure-update.validate-contract';
import { validateInfrastructureUpdate } from '../validators/infrastructure-update.validator';

export function infrastructureUpdateVo(
    contract: InfrastructureUpdateContract
): InfrastructureUpdateValidateContract {
    validateInfrastructureUpdate(contract);
    return {
        uniqId: contract.uniqId,
        name: contract.name,
        type: contract.type,
        position: contract.position,
        description: contract.description,
    };
}
