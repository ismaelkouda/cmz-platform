import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { appConfig } from './app.config';

/**
 * `App` dépend transitivement (via `DialogOutletComponent`/
 * `ToastOutletComponent` dans son template, et `UiFeedbackService` dans son
 * constructeur) de `LocalizeTranslationService`, `NotificationPort`, `StoragePort`,
 * `NavigationPort`, etc. — toute la composition root. Empiler des doubles
 * minimaux un par un (`NG0201`) au fil des erreurs de résolution DI serait
 * fragile et diffuserait une deuxième vérité sur "ce que `App` a besoin".
 * On réutilise donc directement `appConfig.providers`, la même composition
 * root que la production (`main.ts`) : ce test vérifie que l'arbre de DI réel
 * permet bien de créer `App`, pas une reconstruction partielle qui pourrait
 * diverger silencieusement de `app.config.ts`.
 *
 * Avant ce correctif, ce test — le seul test de niveau `apps/` du dépôt —
 * échouait avec `NG0201: No provider found for StoragePort` (`provideRouter`
 * seul ne suffit pas), non détecté car `bunx nx test backoffice-angular`
 * n'avait encore jamais été exécuté dans cette session avant cet audit.
 * Aucune requête réseau n'est déclenchée par la simple création du
 * composant : les routes sont lazy et le catalogue `$localize` est compilé,
 * sans initialiseur ni chargement HTTP au bootstrap.
 */
describe('App', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [...appConfig.providers],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(App);
        expect(fixture.componentInstance).toBeTruthy();
    });
});
