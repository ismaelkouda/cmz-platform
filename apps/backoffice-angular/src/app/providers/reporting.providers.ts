import { Provider } from '@angular/core';
import { ReportingRepository } from '@cmz/reporting-domain';
import { ReportingRepositoryImpl } from '@cmz/reporting-data';

/**
 * Composition root du module `reporting` : bind le port domaine `ReportingRepository`
 * vers l'implémentation data `ReportingRepositoryImpl`.
 */
export function provideReporting(): Provider[] {
    return [
        { provide: ReportingRepository, useClass: ReportingRepositoryImpl },
    ];
}
