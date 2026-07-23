import { GenericRequiredError } from '@cmz/shared-domain';
import { InfrastructureTypeDisableContract } from '../contracts/infrastructure-type-disable.contract';
import { InfrastructureTypeDisableValidateContract } from '../contracts/infrastructure-type-disable.validate-contract';

export function validateInfrastructureTypeDisable(
    contract: InfrastructureTypeDisableContract
): asserts contract is InfrastructureTypeDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_INFRASTRUCTURE.INFRASTRUCTURE_TYPE.FORM.ERROR.DISABLE.UNIQ_ID_REQUIRE'
        );
    }
}
