import { inject, Service } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';

// Chemin relatif à ce que le build sert réellement : project.json déclare
// assets: apps/backoffice-angular/public/ -> les traductions vivent dans
// public/i18n/ (pas src/assets/i18n/, convention Angular CLI classique que
// suppose le schematic @jsverse/transloco:ng-add par défaut). Même piège
// documenté dans docs/architecture/i18n-generator-scope.md (constaté à
// l'origine sur une app de test Angular depuis retirée du repo).
//
// @Service() root-scope légitime : dépend uniquement de HttpClient (fourni
// par provideHttpClient(), valeur par défaut réelle) — pas de token custom
// sans défaut. Le schematic @jsverse/transloco:ng-add génère
// @Injectable({ providedIn: 'root' }) (idiome pré-Angular 19) — corrigé
// manuellement vers @Service(), convention de ce repo (cf. OPS-25bis).
@Service()
export class TranslocoHttpLoader implements TranslocoLoader {
    private http = inject(HttpClient);

    getTranslation(lang: string) {
        return this.http.get<Translation>(`i18n/${lang}.json`);
    }
}
