import { ReportSource } from '@cmz/shared-domain';
import { ReportType } from '@cmz/shared-domain';
import { TelecomOperator } from '@cmz/shared-domain';
import { TypeReport } from '@cmz/shared-domain';

/** Forme métier d'un signalement dans le volet « Files d'attente ». */
export interface RejectReportStatesProps {
    readonly type: TypeReport;
    readonly uniqId: string;
    readonly reportType: ReportType;
    readonly operators: TelecomOperator[];
    readonly source: ReportSource;
    readonly initiatorPhoneNumber: string;
    readonly reportedAt: string;
    readonly updatedAt: string;
}
