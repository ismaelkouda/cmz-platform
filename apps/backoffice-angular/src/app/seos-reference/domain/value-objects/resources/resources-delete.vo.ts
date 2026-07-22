import { ResourcesDeleteContract } from '@pages/seos-reference/domain/contracts/resources/resources-delete.contract';
import { ResourcesDeleteValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-delete.validate-contract';
import { validateResourcesDelete } from '@pages/seos-reference/domain/validators/resources/resources-delete.validator';

export function resourcesDeleteVo(
    contract: ResourcesDeleteContract
): ResourcesDeleteValidateContract {
    validateResourcesDelete(contract);
    return contract;
}
