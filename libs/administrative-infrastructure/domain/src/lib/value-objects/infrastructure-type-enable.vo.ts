import { InfrastructureTypeEnableContract } from '../contracts/infrastructure-type-enable.contract';
import { InfrastructureTypeEnableValidateContract } from '../contracts/infrastructure-type-enable.validate-contract';
import { validateInfrastructureTypeEnable } from '../validators/infrastructure-type-enable.validator';

export function infrastructureTypeEnableVo(
    contract: InfrastructureTypeEnableContract
): InfrastructureTypeEnableValidateContract {
    validateInfrastructureTypeEnable(contract);
    return contract;
}
