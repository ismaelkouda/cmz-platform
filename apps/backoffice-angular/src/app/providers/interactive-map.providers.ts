import { Provider } from '@angular/core';
import { InteractiveMapRepository } from '@cmz/interactive-map-domain';
import { InteractiveMapRepositoryImpl } from '@cmz/interactive-map-data';
import {
    InteractiveMapReportsUseCase,
    InteractiveMapSigFacade,
    MapFacade,
    MapUseCase,
} from '@cmz/interactive-map-application';

/**
 * Composition root du module `interactive-map` : bind le port domaine `InteractiveMapRepository`
 * vers l'implémentation data `InteractiveMapRepositoryImpl`.
 *
 * OPS-25bis (2026-08-21) : `InteractiveMapReportsUseCase`/`MapUseCase` et
 * leurs façades (`InteractiveMapSigFacade`/`MapFacade`) sont passés à
 * `@Service({ autoProvided: false })` (voir leurs docstrings respectifs, et
 * celui de `LoginUseCase`/`LoginFacade` dans `authentication`) car ils
 * injectent `InteractiveMapRepository`, qui n'est fourni que dans cet
 * injecteur de route — pas dans le root. Fournis explicitement ci-dessous
 * pour que toute la chaîne Facade → UseCase → Repository résolve dans le
 * même injecteur enfant.
 */
export function provideInteractiveMap(): Provider[] {
    return [
        {
            provide: InteractiveMapRepository,
            useClass: InteractiveMapRepositoryImpl,
        },
        InteractiveMapReportsUseCase,
        MapUseCase,
        InteractiveMapSigFacade,
        MapFacade,
    ];
}
