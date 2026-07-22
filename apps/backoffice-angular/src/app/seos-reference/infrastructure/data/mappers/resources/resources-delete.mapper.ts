import { ResourcesDeleteValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-delete.validate-contract';
import { ResourcesDeleteApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-delete-api.dto';

export function resourcesDeleteMapper(
    validContract: ResourcesDeleteValidateContract
): ResourcesDeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
