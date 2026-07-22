import { ResourcesUpdateValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-update.validate-contract';
import { ResourcesUpdateApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-update-api.dto';

export function resourcesUpdateMapper(
    validContract: ResourcesUpdateValidateContract
): ResourcesUpdateApiDto {
    return {
        id: validContract.uniqId,
        code: validContract.code,
        name: validContract.name,
        description: validContract.description,
    };
}
