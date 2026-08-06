import { Service } from '@angular/core';
import { MunicipalityOption } from '@cmz/administrative-boundary-domain';
import { ArrayResponseMapper, MapperUtils } from '@cmz/shared-data';
import { MunicipalitySelectItemApiDto } from '../dtos/municipality-select-response-api.dto';

@Service()
export class MunicipalitySelectMapper extends ArrayResponseMapper<
    MunicipalityOption,
    MunicipalitySelectItemApiDto
> {
    protected mapItemFromDto(
        dto: MunicipalitySelectItemApiDto
    ): MunicipalityOption {
        MapperUtils.validateDto(dto, { required: ['id', 'name', 'code'] });
        return { id: dto.id, name: dto.name, code: dto.code };
    }
}
