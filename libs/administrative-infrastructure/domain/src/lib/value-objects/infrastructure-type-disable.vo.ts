import { InfrastructureTypeDisableContract } from '../contracts/infrastructure-type-disable.contract';
import { InfrastructureTypeDisableValidateContract } from '../contracts/infrastructure-type-disable.validate-contract';
import { validateInfrastructureTypeDisable } from '../validators/infrastructure-type-disable.validator';

export function infrastructureTypeDisableVo(
    contract: InfrastructureTypeDisableContract
): InfrastructureTypeDisableValidateContract {
    validateInfrastructureTypeDisable(contract);
    return contract;
}
