import { Provider } from '@angular/core';
import { InteractiveMapRepository } from '@cmz/interactive-map-domain';
import { InteractiveMapRepositoryImpl } from '@cmz/interactive-map-data';

/**
 * Composition root du module `interactive-map` : bind le port domaine `InteractiveMapRepository`
 * vers l'implémentation data `InteractiveMapRepositoryImpl`.
 */
export function provideInteractiveMap(): Provider[] {
    return [
        {
            provide: InteractiveMapRepository,
            useClass: InteractiveMapRepositoryImpl,
        },
    ];
}
