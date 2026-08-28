import { inject, Service } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';

// Chemin relatif à ce que le build sert réellement : les fichiers de
// traduction vivent dans apps/newsletter-test/public/i18n/ (pas src/assets/,
// que cette app ne déclare pas dans project.json targets.build.options.assets
// — corrigé après génération par le schematic @jsverse/transloco:ng-add, qui
// suppose la convention Angular CLI classique src/assets/).
//
// @Service() root-scope légitime : dépend uniquement de HttpClient (fourni
// par provideHttpClient(), valeur par défaut réelle) — pas de token custom
// sans défaut, contrairement à ActionRequestClient (autoProvided:false, voir
// libs/newsletter-angular/data/src/lib/action-request-client.ts). Le schematic
// @jsverse/transloco:ng-add génère @Injectable({ providedIn: 'root' })
// (idiome pré-Angular 19) — corrigé manuellement vers @Service(), l'idiome
// recommandé par la doc Angular actuelle dans ce repo (cf. OPS-25bis).
@Service()
export class TranslocoHttpLoader implements TranslocoLoader {
    private http = inject(HttpClient);

    getTranslation(lang: string) {
        return this.http.get<Translation>(`i18n/${lang}.json`);
    }
}
