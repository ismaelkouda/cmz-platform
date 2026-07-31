import { Provider } from '@angular/core';
import {
    ApproveReportStatesRepository,
    CloseReportStatesRepository,
    DownloadReportStatesRepository,
    EvaluateReportStatesRepository,
    RejectReportStatesRepository,
    ReportStatesDetailsRepository,
} from '@cmz/report-states-domain';
import {
    ApproveReportStatesRepositoryImpl,
    CloseReportStatesRepositoryImpl,
    DownloadReportStatesRepositoryImpl,
    EvaluateReportStatesRepositoryImpl,
    RejectReportStatesRepositoryImpl,
    ReportStatesDetailsRepositoryImpl,
} from '@cmz/report-states-data';

/** Composition root du module `report-states`. */
export function provideReportStates(): Provider[] {
    return [
        {
            provide: ApproveReportStatesRepository,
            useClass: ApproveReportStatesRepositoryImpl,
        },
        {
            provide: EvaluateReportStatesRepository,
            useClass: EvaluateReportStatesRepositoryImpl,
        },
        {
            provide: CloseReportStatesRepository,
            useClass: CloseReportStatesRepositoryImpl,
        },
        {
            provide: RejectReportStatesRepository,
            useClass: RejectReportStatesRepositoryImpl,
        },
        {
            provide: DownloadReportStatesRepository,
            useClass: DownloadReportStatesRepositoryImpl,
        },
        {
            provide: ReportStatesDetailsRepository,
            useClass: ReportStatesDetailsRepositoryImpl,
        },
    ];
}
