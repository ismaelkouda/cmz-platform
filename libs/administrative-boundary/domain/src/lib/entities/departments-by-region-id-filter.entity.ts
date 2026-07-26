import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { DepartmentsByRegionIdFilterValidateContract } from '../contracts/departments-by-region-id-filter.validate-contract';

export function departmentsByRegionIdFilterEntity(
    contract: DepartmentsByRegionIdFilterValidateContract
): DepartmentsByRegionIdFilterValidateContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
