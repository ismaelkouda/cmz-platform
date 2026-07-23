import { InfrastructureCreateValidateContract } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureCreateApiDto } from '../dtos/infrastructure-create-api.dto';

export function infrastructureCreateMapper(
    validContract: InfrastructureCreateValidateContract
): InfrastructureCreateApiDto {
    const params = {} as InfrastructureCreateApiDto;
    if (validContract.name) {
        params.name = validContract.name;
    }
    if (validContract.type) {
        params.infrastructure_type = validContract.type;
    }
    if (validContract.position) {
        params.latitude = validContract.position.latitude;
        params.longitude = validContract.position.longitude;
    }
    if (validContract.description) {
        params.description = validContract.description;
    }
    return params;
}
