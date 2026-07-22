import { ResourcesCreateContract } from '@pages/seos-reference/domain/contracts/resources/resources-create.contract';
import { ResourcesCreateValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-create.validate-contract';
import { validateResourcesCreate } from '@pages/seos-reference/domain/validators/resources/resources-create.validator';

export function resourcesCreateVo(
    contract: ResourcesCreateContract
): ResourcesCreateValidateContract {
    validateResourcesCreate(contract);
    return {
        code: contract.code,
        name: contract.name,
        description: contract.description,
    };
}
