import { InfrastructureTypeDeleteContract } from '../contracts/infrastructure-type-delete.contract';
import { InfrastructureTypeDeleteValidateContract } from '../contracts/infrastructure-type-delete.validate-contract';
import { validateInfrastructureTypeDelete } from '../validators/infrastructure-type-delete.validator';

export function infrastructureTypeDeleteVo(
    contract: InfrastructureTypeDeleteContract
): InfrastructureTypeDeleteValidateContract {
    validateInfrastructureTypeDelete(contract);
    return contract;
}
