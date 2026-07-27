import { OpticalFiberNetworkCreateValidateContract } from '@cmz/coverage-areas-domain';
import { OpticalFiberNetworkCreateApiDto } from '../dtos/optical-fiber-network-create-api.dto';

export function opticalFiberNetworkCreateMapper(
    validContract: OpticalFiberNetworkCreateValidateContract
): OpticalFiberNetworkCreateApiDto {
    return {
        name: validContract.name,
        operator: validContract.operator,
        fiber_constructor_id: validContract.fiberConstructorId,
        type: validContract.type,
        geom_file: validContract.geomFile,
    };
}
