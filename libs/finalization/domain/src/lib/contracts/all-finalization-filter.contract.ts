import { ReportType, TelecomOperator } from '@cmz/shared-domain';
import { FinalizationAllState } from '../enums/finalization-all-state.enum';

export interface AllFinalizationFilterContract {
    initiatorPhoneNumber?: string;
    uniqId?: string;
    reportType?: ReportType;
    operators?: TelecomOperator[];
    source?: string;
    startDate?: Date;
    endDate?: Date;
    state?: FinalizationAllState;
}
