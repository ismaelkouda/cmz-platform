import { ResourcesFindOneFilterContract } from '@pages/seos-reference/domain/contracts/resources/resources-find-one-filter.contract';
import { ResourcesFindOneFilterValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-find-one-filter.validate-contract';
import { validateResourcesFindOneFilter } from '@pages/seos-reference/domain/validators/resources/resources-find-one-filter.validator';

export function resourcesFindOneFilterVo(
    contract: ResourcesFindOneFilterContract
): ResourcesFindOneFilterValidateContract {
    validateResourcesFindOneFilter(contract);
    return contract;
}
