import { GenericRequiredError } from '@cmz/shared-domain';
import { InfrastructureTypeEnableContract } from '../contracts/infrastructure-type-enable.contract';
import { InfrastructureTypeEnableValidateContract } from '../contracts/infrastructure-type-enable.validate-contract';

export function validateInfrastructureTypeEnable(
    contract: InfrastructureTypeEnableContract
): asserts contract is InfrastructureTypeEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.FORM.ERROR.ENABLE.UNIQ_ID_REQUIRE'
        );
    }
}
