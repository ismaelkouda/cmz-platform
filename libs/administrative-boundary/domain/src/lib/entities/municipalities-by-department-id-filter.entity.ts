import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { MunicipalitiesByDepartmentIdFilterValidateContract } from '../contracts/municipalities-by-department-id-filter.validate-contract';

export function municipalitiesByDepartmentIdFilterEntity(
    contract: MunicipalitiesByDepartmentIdFilterValidateContract
): MunicipalitiesByDepartmentIdFilterValidateContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
