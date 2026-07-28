import { AccessLogsFilterContract } from '../contracts/access-logs-filter.contract';
import { validateAccessLogsFilter } from '../validators/access-logs-filter.validator';

export function accessLogsFilterVo(
    contract: AccessLogsFilterContract
): AccessLogsFilterContract {
    validateAccessLogsFilter(contract);
    return contract;
}
