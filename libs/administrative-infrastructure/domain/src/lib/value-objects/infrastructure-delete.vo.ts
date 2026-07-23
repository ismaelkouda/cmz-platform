import { InfrastructureDeleteContract } from '../contracts/infrastructure-delete.contract';
import { InfrastructureDeleteValidateContract } from '../contracts/infrastructure-delete.validate-contract';
import { validateInfrastructureDelete } from '../validators/infrastructure-delete.validator';

export function infrastructureDeleteVo(
    contract: InfrastructureDeleteContract
): InfrastructureDeleteValidateContract {
    validateInfrastructureDelete(contract);
    return contract;
}
