import { Provider } from '@angular/core';
import { ReportingRepository } from '@cmz/reporting-domain';
import { ReportingRepositoryImpl } from '@cmz/reporting-data';
import {
    ReportByChannelFacade,
    ReportByOperatorFacade,
    ReportFacade,
    ReportingUseCase,
    RequestsFacade,
} from '@cmz/reporting-application';

/**
 * Composition root du module `reporting` : bind le port domaine `ReportingRepository`
 * vers l'implémentation data `ReportingRepositoryImpl`.
 *
 * OPS-25bis : `ReportingUseCase` et les 4 façades sont passés à
 * `@Service({ autoProvided: false })` (voir leurs docstrings) car ils
 * dépendent transitivement de `ReportingRepository`, qui n'est plus fourni
 * en root depuis la migration lazy-provider. Fournis ici explicitement, dans
 * le même injecteur que le repository.
 */
export function provideReporting(): Provider[] {
    return [
        { provide: ReportingRepository, useClass: ReportingRepositoryImpl },
        ReportingUseCase,
        ReportFacade,
        ReportByOperatorFacade,
        RequestsFacade,
        ReportByChannelFacade,
    ];
}
