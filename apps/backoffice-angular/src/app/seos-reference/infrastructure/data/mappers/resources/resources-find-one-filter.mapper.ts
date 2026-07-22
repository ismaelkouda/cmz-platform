import { ResourcesFindOneFilterValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-find-one-filter.validate-contract';
import { ResourcesFindOneFilterApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-find-one-filter-api.dto';

export function resourcesFindOneFilterMapper(
    validContract: ResourcesFindOneFilterValidateContract
): ResourcesFindOneFilterApiDto {
    return { id: validContract.uniqId };
}
