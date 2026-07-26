import { MunicipalitiesByDepartmentIdFilterContract } from '../contracts/municipalities-by-department-id-filter.contract';
import { MunicipalitiesByDepartmentIdFilterValidateContract } from '../contracts/municipalities-by-department-id-filter.validate-contract';
import { validateMunicipalitiesByDepartmentIdFilter } from '../validators/municipalities-by-department-id-filter.validator';

export function municipalitiesByDepartmentIdFilterVo(
    contract: MunicipalitiesByDepartmentIdFilterContract
): MunicipalitiesByDepartmentIdFilterValidateContract {
    validateMunicipalitiesByDepartmentIdFilter(contract);
    return contract as MunicipalitiesByDepartmentIdFilterValidateContract;
}
