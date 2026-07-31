import { ReportType, TelecomOperator } from '@cmz/shared-domain';
import { ProcessingAllState } from '../enums/processing-all-state.enum';

export interface AllProcessingFilterContract {
    initiatorPhoneNumber?: string;
    uniqId?: string;
    reportType?: ReportType;
    operators?: TelecomOperator[];
    source?: string;
    startDate?: Date;
    endDate?: Date;
    state?: ProcessingAllState;
}
