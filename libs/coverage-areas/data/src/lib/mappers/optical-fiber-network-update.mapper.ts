import { OpticalFiberNetworkUpdateValidateContract } from '@cmz/coverage-areas-domain';
import { OpticalFiberNetworkUpdateApiDto } from '../dtos/optical-fiber-network-update-api.dto';

export function opticalFiberNetworkUpdateMapper(
    validContract: OpticalFiberNetworkUpdateValidateContract
): OpticalFiberNetworkUpdateApiDto {
    const params: OpticalFiberNetworkUpdateApiDto = {
        id: validContract.uniqId,
        name: validContract.name,
        operator: validContract.operator,
        fiber_constructor_id: validContract.fiberConstructorId,
        type: validContract.type,
    };
    if (validContract.geomFile) {
        params.geom_file = validContract.geomFile;
    }
    return params;
}
