import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import {
    ACTION_REQUEST_BASE_URL,
    ActionRequestClient,
} from '@cmz/newsletter-angular-data';
import {
    ACTION_REQUEST_PORT,
    ActionRequestCommands,
} from '@cmz/newsletter-angular-application';
import { App } from './app';
import fr from '../../public/i18n/fr.json';
import en from '../../public/i18n/en.json';

// TranslocoTestingModule.forRoot() charge les traductions de façon
// synchrone en test (pas de HttpClient réel requis) — voir la doc officielle
// Transloco §Unit Testing. Évite de mocker le loader HTTP à la main.
describe('App', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                App,
                TranslocoTestingModule.forRoot({
                    langs: { fr, en },
                    translocoConfig: {
                        availableLangs: ['fr', 'en'],
                        defaultLang: 'fr',
                    },
                    preloadLangs: true,
                }),
            ],
            providers: [
                provideHttpClient(),
                {
                    provide: ACTION_REQUEST_BASE_URL,
                    useValue: 'http://localhost:4310',
                },
                ActionRequestClient,
                {
                    provide: ACTION_REQUEST_PORT,
                    useExisting: ActionRequestClient,
                },
                ActionRequestCommands,
            ],
        }).compileComponents();
    });

    it('should render the newsletter form title', () => {
        const fixture = TestBed.createComponent(App);
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('h1')?.textContent).toContain(
            'Newsletter'
        );
    });
});
