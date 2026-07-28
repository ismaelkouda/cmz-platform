import { Provider } from '@angular/core';
import { ReportStatesRepository } from '@cmz/report-states-domain';
import { ReportStatesRepositoryImpl } from '@cmz/report-states-data';

/**
 * Composition root du module `report-states` : bind le port domaine `ReportStatesRepository`
 * vers l'implémentation data `ReportStatesRepositoryImpl`.
 */
export function provideReportStates(): Provider[] {
    return [
        {
            provide: ReportStatesRepository,
            useClass: ReportStatesRepositoryImpl,
        },
    ];
}
