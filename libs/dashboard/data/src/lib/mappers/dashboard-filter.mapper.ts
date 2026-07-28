import { DashboardFilterValidateContract } from '@cmz/dashboard-domain';
import { DashboardFilterApiDto } from '../dtos/dashboard-filter-api.dto';

export function dashboardFilterMapper(
    contract: DashboardFilterValidateContract
): DashboardFilterApiDto {
    return { period: Number(contract.period) };
}
