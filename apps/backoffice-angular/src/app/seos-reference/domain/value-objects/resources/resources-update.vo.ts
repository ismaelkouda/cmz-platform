import { ResourcesUpdateContract } from '@pages/seos-reference/domain/contracts/resources/resources-update.contract';
import { ResourcesUpdateValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-update.validate-contract';
import { validateResourcesUpdate } from '@pages/seos-reference/domain/validators/resources/resources-update.validator';

export function resourcesUpdateVo(
    contract: ResourcesUpdateContract
): ResourcesUpdateValidateContract {
    validateResourcesUpdate(contract);
    return {
        uniqId: contract.uniqId,
        code: contract.code,
        name: contract.name,
        description: contract.description,
    };
}
