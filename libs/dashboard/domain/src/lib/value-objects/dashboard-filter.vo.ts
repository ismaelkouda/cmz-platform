import { DashboardFilterContract } from '../contracts/dashboard-filter.contract';
import { DashboardFilterValidateContract } from '../contracts/dashboard-filter.validate-contract';
import { validateDashboardFilter } from '../validators/dashboard-filter.validator';

export function dashboardFilterVo(
    contract: DashboardFilterContract
): DashboardFilterValidateContract {
    validateDashboardFilter(contract);
    return { period: contract.period };
}
