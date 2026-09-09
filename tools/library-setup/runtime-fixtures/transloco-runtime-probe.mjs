import { JSDOM } from 'jsdom';

function fail(message) {
    throw new Error(`transloco runtime probe: ${message}`);
}

function installDomGlobals(window) {
    Object.defineProperties(globalThis, {
        window: { configurable: true, value: window },
        document: { configurable: true, value: window.document },
        navigator: { configurable: true, value: window.navigator },
    });
    for (const key of Reflect.ownKeys(window)) {
        if (key in globalThis) continue;
        Object.defineProperty(globalThis, key, {
            configurable: true,
            get: () => window[key],
        });
    }
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    pretendToBeVisual: true,
    url: 'https://runtime-proof.invalid/',
});
installDomGlobals(dom.window);

await import('@angular/compiler');
const { Component } = await import('@angular/core');
const { TestBed } = await import('@angular/core/testing');
const { BrowserTestingModule, platformBrowserTesting } =
    await import('@angular/platform-browser/testing');
const { TranslocoPipe, TranslocoService, TranslocoTestingModule } =
    await import('@jsverse/transloco');
const { firstValueFrom } = await import('rxjs');

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

class TranslocoRuntimeProbe {}
Component({
    imports: [TranslocoPipe],
    template: '<span data-proof>{{ "proof.message" | transloco }}</span>',
})(TranslocoRuntimeProbe);

try {
    await TestBed.configureTestingModule({
        imports: [
            TranslocoRuntimeProbe,
            TranslocoTestingModule.forRoot({
                langs: { fr: { proof: { message: 'preuve-traduite' } } },
                translocoConfig: {
                    availableLangs: ['fr'],
                    defaultLang: 'fr',
                },
                preloadLangs: true,
            }),
        ],
    }).compileComponents();
    const service = TestBed.inject(TranslocoService);
    await firstValueFrom(service.load('fr'));
    service.setActiveLang('fr');
    const fixture = TestBed.createComponent(TranslocoRuntimeProbe);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const rendered = fixture.nativeElement.textContent.trim();
    if (rendered !== 'preuve-traduite') {
        fail(`texte rendu inattendu : ${JSON.stringify(rendered)}`);
    }
    if (rendered.includes('proof.message')) {
        fail('la clé brute est restée visible');
    }
} finally {
    TestBed.resetTestEnvironment();
    dom.window.close();
}
