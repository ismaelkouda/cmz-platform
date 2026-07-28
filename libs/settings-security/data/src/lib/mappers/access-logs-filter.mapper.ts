import { Service } from '@angular/core';
import { AccessLogsFilterContract } from '@cmz/settings-security-domain';
import { AccessLogsFilterApiDto } from '../dtos/access-logs-filter-api.dto';

@Service()
export class AccessLogsFilterMapper {
    mapContractToApi(
        contract: AccessLogsFilterContract
    ): AccessLogsFilterApiDto {
        const params: AccessLogsFilterApiDto = {};
        if (contract.search) {
            params.search = contract.search;
        }
        if (contract.action) {
            params.action = contract.action;
        }
        if (contract.startDate) {
            params.start_date = contract.startDate.toISOString();
        }
        if (contract.endDate) {
            params.end_date = contract.endDate.toISOString();
        }
        return params;
    }
}
