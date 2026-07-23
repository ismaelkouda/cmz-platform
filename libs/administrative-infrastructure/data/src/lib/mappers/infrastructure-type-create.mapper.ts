import { InfrastructureTypeCreateValidateContract } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureTypeCreateApiDto } from '../dtos/infrastructure-type-create-api.dto';

export function infrastructureTypeCreateMapper(
    validContract: InfrastructureTypeCreateValidateContract
): InfrastructureTypeCreateApiDto {
    const params = {} as InfrastructureTypeCreateApiDto;
    if (validContract.name) {
        params.name = validContract.name;
    }
    if (validContract.description) {
        params.description = validContract.description;
    }
    return params;
}
