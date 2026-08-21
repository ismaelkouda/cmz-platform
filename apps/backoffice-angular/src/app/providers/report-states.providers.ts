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
import {
    ApproveReportStatesFacade,
    ApproveReportStatesUseCase,
    CloseReportStatesFacade,
    CloseReportStatesUseCase,
    DownloadReportStatesFacade,
    DownloadReportStatesUseCase,
    EvaluateReportStatesFacade,
    EvaluateReportStatesUseCase,
    RejectReportStatesFacade,
    RejectReportStatesUseCase,
    ReportStatesDetailsFacade,
    ReportStatesDetailsUseCase,
} from '@cmz/report-states-application';

/**
 * Composition root du module `report-states`.
 *
 * OPS-25bis (2026-08-21) : les 6 UseCase et 6 Facade de ce module sont
 * passés à `@Service({ autoProvided: false })` (voir leurs docstrings
 * respectifs, et celui de `LoginUseCase`/`LoginFacade` dans
 * `authentication`) car ils injectent — directement ou transitivement
 * (`ReportStatesDetailsFacade` injecte `ApproveReportStatesFacade`,
 * `EvaluateReportStatesFacade` et `RejectReportStatesFacade`) — un
 * Repository de ce module, fourni uniquement dans cet injecteur de route.
 * Fournis explicitement ci-dessous pour que toute la chaîne
 * Facade → UseCase → Repository résolve dans le même injecteur enfant.
 */
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
        ApproveReportStatesUseCase,
        EvaluateReportStatesUseCase,
        CloseReportStatesUseCase,
        RejectReportStatesUseCase,
        DownloadReportStatesUseCase,
        ReportStatesDetailsUseCase,
        ApproveReportStatesFacade,
        EvaluateReportStatesFacade,
        CloseReportStatesFacade,
        RejectReportStatesFacade,
        DownloadReportStatesFacade,
        ReportStatesDetailsFacade,
    ];
}
