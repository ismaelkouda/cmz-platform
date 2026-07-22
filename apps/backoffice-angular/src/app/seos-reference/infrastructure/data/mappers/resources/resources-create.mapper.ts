import { ResourcesCreateValidateContract } from '@pages/seos-reference/domain/contracts/resources/resources-create.validate-contract';
import { ResourcesCreateApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-create-api.dto';

export function resourcesCreateMapper(
    validContract: ResourcesCreateValidateContract
): ResourcesCreateApiDto {
    return {
        code: validContract.code,
        name: validContract.name,
        description: validContract.description,
    };
}
