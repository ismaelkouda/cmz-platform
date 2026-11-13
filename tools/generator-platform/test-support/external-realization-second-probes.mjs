// X4-sécurité 2 : les 127 nouvelles pages du validateur (agent E,
// validation-X4-securite.md, `nouvelles-sondes*.mjs`), recopiées à l'octet
// près ; chaque fichier garde sa portée. Format du validateur :
// [id, fichier, texte, mode, trouver]. `append` (défaut) ajoute à la fin,
// `prepend` au début, `replace` insère le texte après `trouver` (l'ancre
// reste, comme dans la mesure du validateur : une seule violation pour
// M-spread-host).
// nouvelles-sondes.mjs, recopié tel quel.
const ROUND_1 = (() => {
    // Validateur E, X4-sécurité : sondes AU-DELÀ des 74 pages rejouées.
    // Format : [id, fichier, texte, mode, trouver]
    //   mode 'append' (défaut) : texte ajouté à la fin du fichier de référence ;
    //   'prepend'              : texte ajouté au début ;
    //   'replace'              : `trouver` (une occurrence) remplacé par `texte`.
    // `attendu` (6e élément) n'est qu'une note du validateur, jamais utilisée pour
    // juger : le verdict vient du code réel.
    const TS = 'page.component.ts';
    const HTML = 'page.component.html';
    const SCSS = 'page.component.scss';
    const OFFLINE = "'(window:offline)': 'online.set(false)',";

    return [
        // ---- demandées par le contrôleur : TypeScript ----
        [
            'N-ts-declare-fetch',
            TS,
            "\ndeclare const fetch: any;\nvoid fetch('/api/x');\n",
        ],
        [
            'N-ts-declare-function-fetch',
            TS,
            "\ndeclare function fetch(url: string): unknown;\nvoid fetch('/api/x');\n",
        ],
        [
            'N-ts-declare-location',
            TS,
            "\ndeclare let location: any;\nlocation = '//exemple.invalid/';\n",
        ],
        [
            'N-ts-declare-navigation',
            TS,
            "\ndeclare const navigation: any;\nvoid navigation.navigate('//exemple.invalid/');\n",
        ],
        [
            'N-ts-declare-localStorage',
            TS,
            "\ndeclare const localStorage: any;\nvoid localStorage.getItem('k');\n",
        ],
        [
            'N-ts-declare-window',
            TS,
            "\ndeclare const window: any;\nvoid window.navigation.navigate('//exemple.invalid/');\n",
        ],
        [
            'N-ts-declare-XMLHttpRequest',
            TS,
            '\ndeclare const XMLHttpRequest: any;\nvoid new XMLHttpRequest();\n',
        ],
        [
            'N-ts-destructure-navigation',
            TS,
            "\nexport function leakNav(e: Event) {\n    const { ownerDocument: d } = e.target as any;\n    const { defaultView: w } = d;\n    w.navigation.navigate('//exemple.invalid/');\n}\n",
        ],
        [
            'N-ts-destructure-fetch-meme-origine',
            TS,
            "\nexport function leakApi(e: Event) {\n    const { ownerDocument: d } = e.target as any;\n    const { defaultView: w } = d;\n    const { fetch: f } = w;\n    void f(['/acc', 'ess'].join(''), { method: 'POST' });\n}\n",
        ],
        [
            'N-ts-destructure-localStorage',
            TS,
            "\nexport function leakStore(e: Event) {\n    const { ownerDocument: d } = e.target as any;\n    const { defaultView: w } = d;\n    const { localStorage: s } = w;\n    s.setItem('k', 'v');\n}\n",
        ],
        [
            'N-ts-event-view-navigation',
            TS,
            "\nexport function leakView(e: UIEvent) {\n    (e.view as any).navigation.navigate('//exemple.invalid/');\n}\n",
        ],
        [
            'N-ts-event-view-WebSocket',
            TS,
            "\nexport function leakWs(e: UIEvent) {\n    void new (e.view as any).WebSocket('wss://exemple.invalid');\n}\n",
        ],
        [
            'N-ts-event-view-fetch-temoin',
            TS,
            "\nexport function leakFetch(e: UIEvent) {\n    void (e.view as any).fetch('/api/x');\n}\n",
        ],
        [
            'N-ts-descriptor-defaultView',
            TS,
            "\nexport function leakDescriptor(e: Event) {\n    const d = (e.target as any).getRootNode();\n    const proto = Object.getPrototypeOf(Object.getPrototypeOf(d));\n    const w = Object.getOwnPropertyDescriptor(proto, 'defaultView')?.get?.call(d);\n    return w;\n}\n",
        ],
        [
            'N-ts-assign-href-et-clic',
            TS,
            "\nexport function leakLink(e: Event) {\n    Object.assign(e.target as any, { href: '//exemple.invalid/' });\n    (e.target as any).click();\n}\n",
        ],
        [
            'N-ts-assign-innerHTML',
            TS,
            "\nexport function leakHtml(e: Event) {\n    Object.assign(e.target as any, { innerHTML: '<img src=//exemple.invalid/x.png>' });\n}\n",
        ],
        // table « constante » modifiée
        [
            'N-ts-table-reaffectation',
            TS,
            '\nexport function patch(k: string, v: string) {\n    (ANNOUNCEMENTS as Record<string, string>)[k] = v;\n}\n',
        ],
        [
            'N-ts-table-proto-pollution',
            TS,
            "\nconst POLLUTION: any = {};\nexport function pollute() {\n    const key = ['__pro', 'to__'].join('');\n    POLLUTION[key].polluted = true;\n}\n",
        ],
        [
            'N-ts-table-proto-litteral-objet',
            TS,
            "\nconst INHERIT: any = { __proto__: Object.getPrototypeOf(() => 1) };\nexport function ctor() {\n    const key = ['const', 'ructor'].join('');\n    return INHERIT[key];\n}\n",
        ],
        // chaîne assemblée autrement
        [
            'N-ts-join-http',
            TS,
            "\nexport const BASE_JOIN = ['ht', 'tp://exemple.invalid'].join('');\n",
        ],
        [
            'N-ts-concat-methode',
            TS,
            "\nexport const BASE_CONCAT = 'ht'.concat('tp://exemple.invalid');\n",
        ],
        [
            'N-ts-gabarit-variable',
            TS,
            "\nconst PROTO = 'http';\nexport const BASE_TPL = `${PROTO}://exemple.invalid`;\n",
        ],
        [
            'N-ts-fromCharCode',
            TS,
            '\nexport const BASE_CODES = String.fromCharCode(104, 116, 116, 112, 58, 47, 47);\n',
        ],
        [
            'N-ts-endpoint-join',
            TS,
            "\nexport const PATH_JOIN = ['/acc', 'ess'].join('');\n",
        ],
        [
            'N-ts-endpoint-echappement-hexa',
            TS,
            "\nexport const PATH_HEX = '\\x2facc\\x65ss';\n",
        ],
        // injecteur détourné
        [
            'N-ts-injector-get-parametre',
            TS,
            '\nexport function hijack(i: Injector, token: unknown) {\n    return (i as any).get(token);\n}\n',
        ],
        [
            'N-ts-injector-get-tableau',
            TS,
            '\nconst TOKENS: unknown[] = [];\nexport function hijackTable(i: Injector) {\n    return (i as any).get(TOKENS[0]);\n}\n',
        ],
        [
            'N-ts-injector-records-document',
            TS,
            "\nexport function hijackDocument(i: Injector) {\n    const keys = [...(i as any).records.keys()];\n    const token = keys.find((k) => String(k).includes('DocumentToken'));\n    return (i as any).get(token);\n}\n",
        ],
        [
            'N-ts-injector-get-DOCUMENT-alias',
            TS,
            "import { DOCUMENT as D } from '@angular/common';\nvoid D;\n",
            'prepend',
        ],
        // décorateurs, hôte
        [
            'N-ts-hostbinding-decorateur',
            TS,
            "import { HostBinding } from '@angular/core';\n",
            'prepend',
        ],
        [
            'N-ts-hostbinding-classe',
            TS,
            "\nclass Other {\n    @HostBinding('style.background') bg = 'url(//exemple.invalid/x.png)';\n}\nvoid Other;\n",
        ],
        [
            'N-ts-host-style-url',
            TS,
            `\n    '[style.background]': "'url(//exemple.invalid/x.png)'",`,
            'replace',
            OFFLINE,
        ],
        [
            'N-ts-host-attr-href',
            TS,
            `\n    '[attr.href]': "'//exemple.invalid/'",`,
            'replace',
            OFFLINE,
        ],
        [
            'N-ts-host-evenement-navigue',
            TS,
            `\n    '(click)': "$event.view.navigation.navigate('//exemple.invalid/')",`,
            'replace',
            OFFLINE,
        ],
        // ---- demandées : gabarit HTML ----
        [
            'N-html-routerLink-https',
            HTML,
            '<a routerLink="https://exemple.invalid/x">x</a>\n',
        ],
        [
            'N-html-routerLink-protocole-relatif',
            HTML,
            '<a routerLink="//exemple.invalid/x">x</a>\n',
        ],
        ['N-html-routerLink-lie', HTML, '<a [routerLink]="[\'/x\']">x</a>\n'],
        [
            'N-html-routerLink-chemin-appli',
            HTML,
            '<a routerLink="/access">x</a>\n',
        ],
        ['N-html-routerLink-relatif', HTML, '<a routerLink="../x">x</a>\n'],
        ['N-html-a-href-lie', HTML, '<a [href]="target">x</a>\n'],
        ['N-html-a-attr-href-lie', HTML, '<a [attr.href]="target">x</a>\n'],
        [
            'N-html-a-href-javascript',
            HTML,
            '<a href="javascript:void(0)">x</a>\n',
        ],
        ['N-html-a-href-fragment', HTML, '<a href="#contenu">x</a>\n'],
        [
            'N-html-a-HREF-majuscules',
            HTML,
            '<a HREF="//exemple.invalid/">x</a>\n',
        ],
        [
            'N-html-ngSrc-statique',
            HTML,
            '<img ngSrc="x.png" width="1" height="1" alt="">\n',
        ],
        [
            'N-html-ngSrc-lie',
            HTML,
            '<img [ngSrc]="source" width="1" height="1" alt="">\n',
        ],
        ['N-html-ngSrcset', HTML, '<img ngSrcset="x.png 1x" alt="">\n'],
        [
            'N-html-svg-use-href',
            HTML,
            '<svg><use href="//exemple.invalid/s.svg#a"></use></svg>\n',
        ],
        [
            'N-html-svg-use-xlink-href',
            HTML,
            '<svg><use xlink:href="//exemple.invalid/s.svg#a"></use></svg>\n',
        ],
        [
            'N-html-svg-image-href',
            HTML,
            '<svg><image href="//exemple.invalid/x.png"></image></svg>\n',
        ],
        [
            'N-html-svg-image-xlink-href',
            HTML,
            '<svg><image xlink:href="//exemple.invalid/x.png"></image></svg>\n',
        ],
        [
            'N-html-svg-a-href',
            HTML,
            '<svg><a href="//exemple.invalid/"><text>x</text></a></svg>\n',
        ],
        [
            'N-html-svg-a-xlink-href',
            HTML,
            '<svg><a xlink:href="//exemple.invalid/"><text>x</text></a></svg>\n',
        ],
        ['N-html-svg-script', HTML, '<svg><script>1</script></svg>\n'],
        [
            'N-html-object-data',
            HTML,
            '<object data="//exemple.invalid/x"></object>\n',
        ],
        [
            'N-html-source-srcset',
            HTML,
            '<picture><source srcset="//exemple.invalid/x.png"><img alt=""></picture>\n',
        ],
        [
            'N-html-video-source-src',
            HTML,
            '<video><source src="//exemple.invalid/x.mp4"></video>\n',
        ],
        [
            'N-html-track-src',
            HTML,
            '<video><track src="//exemple.invalid/x.vtt"></video>\n',
        ],
        [
            'N-html-input-image-src',
            HTML,
            '<input type="image" src="//exemple.invalid/x.png" alt="x">\n',
        ],
        [
            'N-html-background',
            HTML,
            '<div background="//exemple.invalid/x.png"></div>\n',
        ],
        ['N-html-src-interpolation', HTML, '<img src="{{ source }}" alt="">\n'],
        ['N-html-href-interpolation', HTML, '<a href="#a{{ source }}">x</a>\n'],
        [
            'N-html-src-casse-mixte',
            HTML,
            '<img SrC="//exemple.invalid/x.png" alt="">\n',
        ],
        [
            'N-html-liaison-SRC-majuscules',
            HTML,
            '<img [SRC]="source" alt="">\n',
        ],
        [
            'N-html-liaison-formAction',
            HTML,
            '<button type="submit" [formAction]="target">x</button>\n',
        ],
        [
            'N-html-link-casse-mixte',
            HTML,
            '<LiNk rel="stylesheet" href="x.css">\n',
        ],
        [
            'N-html-math-href',
            HTML,
            '<math><mi href="//exemple.invalid/">x</mi></math>\n',
        ],
        [
            'N-html-input-formaction',
            HTML,
            '<input type="submit" formaction="//exemple.invalid/">\n',
        ],
        [
            'N-html-style-lie-url',
            HTML,
            '<div [style.background]="\'url(//exemple.invalid/x.png)\'"></div>\n',
        ],
        [
            'N-html-style-lie-entier',
            HTML,
            '<div [style]="\'background:url(//exemple.invalid/x.png)\'"></div>\n',
        ],
        [
            'N-html-style-lie-cssText',
            HTML,
            '<div [style.cssText]="\'background:url(//exemple.invalid/x.png)\'"></div>\n',
        ],
        [
            'N-html-evenement-navigue',
            HTML,
            '<button type="button" (click)="$event.view.navigation.navigate(\'//exemple.invalid/\')">x</button>\n',
        ],
        [
            'N-html-evenement-composedPath',
            HTML,
            '<button type="button" (click)="$event.composedPath().at(-1).navigation.navigate(\'//exemple.invalid/\')">x</button>\n',
        ],
        [
            'N-html-evenement-getRootNode',
            HTML,
            '<button type="button" (click)="$event.target.getRootNode().body">x</button>\n',
        ],
        [
            'N-html-evenement-ownerDocument-temoin',
            HTML,
            '<button type="button" (click)="$event.target.ownerDocument.defaultView">x</button>\n',
        ],
        [
            'N-html-evenement-fenetre',
            HTML,
            '<div (window:click)="$event.view.navigation.navigate(\'//exemple.invalid/\')"></div>\n',
        ],
        // ---- SCSS au-delà des 12 ----
        [
            'N-scss-filter-url',
            SCSS,
            '\n.probe{filter:url(//exemple.invalid/f.svg#f);}\n',
        ],
        [
            'N-scss-mask-url',
            SCSS,
            '\n.probe{mask-image:url(//exemple.invalid/m.png);}\n',
        ],
        [
            'N-scss-list-style-image',
            SCSS,
            '\n.probe{list-style-image:url(//exemple.invalid/l.png);}\n',
        ],
        [
            'N-scss-border-image',
            SCSS,
            '\n.probe{border-image-source:url(//exemple.invalid/b.png);}\n',
        ],
        [
            'N-scss-namespace-url',
            SCSS,
            '\n@namespace url(//exemple.invalid/ns);\n',
        ],
        [
            'N-scss-import-layer',
            SCSS,
            '\n@import url(//exemple.invalid/x.css) layer(x);\n',
        ],
        [
            'N-scss-cross-fade',
            SCSS,
            '\n.probe{background:cross-fade(url(//exemple.invalid/a.png), url(//exemple.invalid/b.png), 50%);}\n',
        ],
        [
            'N-scss-URL-majuscules',
            SCSS,
            '\n.probe{background:URL(//exemple.invalid/x.png);}\n',
        ],
    ];
})();

// nouvelles-sondes-2.mjs, recopié tel quel.
const ROUND_2 = (() => {
    // Validateur E, X4-sécurité : 2e tour, après lecture des refus du 1er tour.
    // Les motifs lexicaux (`fetch(`, `localStorage`, `WebSocket`) refusaient
    // plusieurs sondes du 1er tour sur le MOT, pas sur la structure : ces sondes
    // évitent le mot (alias, déstructuration, clé calculée dans une déstructuration).
    const TS = 'page.component.ts';
    const HTML = 'page.component.html';
    return [
        [
            'R2-ts-declare-fetch-alias',
            TS,
            "\ndeclare const fetch: any;\nconst F = fetch;\nvoid F('/api/x');\n",
        ],
        [
            'R2-ts-declare-window-destructure-fetch',
            TS,
            "\ndeclare const window: any;\nconst { fetch: g } = window;\nvoid g('/api/x');\n",
        ],
        [
            'R2-ts-declare-location-assign',
            TS,
            "\ndeclare const location: any;\nlocation.assign('//exemple.invalid/');\n",
        ],
        [
            'R2-ts-destructure-location-assign',
            TS,
            "\nexport function leakLoc(e: UIEvent) {\n    const { location: loc } = e.view as any;\n    loc.assign('//exemple.invalid/');\n}\n",
        ],
        [
            'R2-ts-destructure-cle-calculee-stockage',
            TS,
            "\nexport function leakStore(e: Event) {\n    const { ownerDocument: d } = e.target as any;\n    const { defaultView: w } = d;\n    const key = ['local', 'Storage'].join('');\n    const { [key]: store } = w;\n    store.setItem('k', 'v');\n}\n",
        ],
        [
            'R2-ts-destructure-cle-calculee-fetch',
            TS,
            "\nexport function leakApi2(e: Event) {\n    const { ownerDocument: d } = e.target as any;\n    const { defaultView: w } = d;\n    const key = ['fe', 'tch'].join('');\n    const { [key]: f } = w;\n    void f('/api/x', { method: 'POST' });\n}\n",
        ],
        [
            'R2-ts-destructure-cle-calculee-websocket',
            TS,
            "\nexport function leakWs2(e: Event) {\n    const { ownerDocument: d } = e.target as any;\n    const { defaultView: w } = d;\n    const key = ['Web', 'Socket'].join('');\n    const { [key]: S } = w;\n    void new S('wss://exemple.invalid');\n}\n",
        ],
        [
            'R2-ts-destructure-cookie',
            TS,
            "\nexport function leakCookie(e: Event) {\n    const { ownerDocument: d } = e.target as any;\n    const key = ['coo', 'kie'].join('');\n    const { [key]: c } = d;\n    return c;\n}\n",
        ],
        [
            'R2-ts-object-entries-fenetre',
            TS,
            '\nexport function leakEntries(e: Event) {\n    const { ownerDocument: d } = e.target as any;\n    const { defaultView: w } = d;\n    return Object.entries(w);\n}\n',
        ],
        [
            'R2-ts-getOwnPropertyDescriptor-fetch',
            TS,
            "\nexport function leakDesc(e: Event) {\n    const { ownerDocument: d } = e.target as any;\n    const { defaultView: w } = d;\n    return Object.getOwnPropertyDescriptor(w, 'fetch')?.value;\n}\n",
        ],
        [
            'R2-ts-vue-sans-evenement-viewChild',
            TS,
            '\nexport function leakDirect(w: any) {\n    return w;\n}\n',
        ],
        [
            'R2-html-svg-a-xlink-externe-absolu',
            HTML,
            '<svg><a xlink:href="https://exemple.invalid/"><text>x</text></a></svg>\n',
        ],
        [
            'R2-html-svg-set-href',
            HTML,
            '<svg><a><set attributeName="href" to="//exemple.invalid/"></set><text>x</text></a></svg>\n',
        ],
        [
            'R2-html-svg-animate-href',
            HTML,
            '<svg><image width="1" height="1"><animate attributeName="href" values="//exemple.invalid/x.png"></animate></image></svg>\n',
        ],
        [
            'R2-html-evenement-destructure-impossible',
            HTML,
            '<button type="button" (click)="$event.target.getRootNode().defaultView">x</button>\n',
        ],
        [
            'R2-html-evenement-clic-externe-lien',
            HTML,
            '<button type="button" (click)="$event.target.setAttribute(\'x\',\'y\')">x</button>\n',
        ],
    ];
})();

// nouvelles-sondes-3.mjs, recopié tel quel.
const ROUND_3 = (() => {
    // Validateur E : métadonnées @Component hors de la forme « propriétés nommées simples ».
    const TS = 'page.component.ts';
    const ANCHOR = 'providers: [...PAGE_COMPOSITION_PROVIDERS],';
    return [
        [
            'M-spread-host',
            TS,
            "\n    ...{ host: { '[attr.href]': \"'//exemple.invalid/'\" } },",
            'replace',
            ANCHOR,
        ],
        [
            'M-spread-imports',
            TS,
            '\n    ...{ imports: [] },',
            'replace',
            ANCHOR,
        ],
        [
            'M-cle-calculee',
            TS,
            "\n    ['host']: { '(click)': \"$event.view.navigation.navigate('//exemple.invalid/')\" },",
            'replace',
            ANCHOR,
        ],
    ];
})();

// nouvelles-sondes-4.mjs, recopié tel quel.
const ROUND_4 = (() => {
    // Validateur E : une sonde à UNE seule violation par entrée de liste survivante.
    // Si le code réel donne exactement la violation de l'entrée, l'entrée est le
    // seul rempart et son retrait (mutant survivant) ouvre une page.
    const TS = 'page.component.ts';
    const HTML = 'page.component.html';
    const prop = (name) => [
        `L-ts-propriete-${name}`,
        TS,
        `\nexport function probe_${name}(x: any) {\n    return x.${name};\n}\n`,
    ];
    return [
        ...[
            'defaultView',
            'top',
            'serviceWorker',
            'nativeElement',
            'setAttribute',
            'postMessage',
            'fetch',
            'parent',
            'createElement',
        ].map(prop),
        [
            'L-tpl-propriete-defaultView',
            HTML,
            '<span>{{ value.defaultView }}</span>\n',
        ],
        ['L-html-element-portal', HTML, '<portal></portal>\n'],
        [
            'L-html-element-iframe-sans-src',
            HTML,
            '<iframe title="x"></iframe>\n',
        ],
        ['L-html-element-frame', HTML, '<frame></frame>\n'],
        ['L-html-attribut-archive', HTML, '<div archive="x"></div>\n'],
        [
            'L-html-attribut-xlink-href-svg',
            HTML,
            '<svg><use xlink:href="#a"></use></svg>\n',
        ],
        [
            'L-ts-import-Location',
            TS,
            "import { Location } from '@angular/common';\nvoid Location;\n",
            'prepend',
        ],
        [
            'L-ts-import-NgOptimizedImage',
            TS,
            "import { NgOptimizedImage } from '@angular/common';\nvoid NgOptimizedImage;\n",
            'prepend',
        ],
        [
            'L-ts-import-RendererFactory2',
            TS,
            "import { RendererFactory2 } from '@angular/core';\nvoid RendererFactory2;\n",
            'prepend',
        ],
    ];
})();

// nouvelles-sondes-5.mjs, recopié tel quel.
const ROUND_5 = (() => {
    // Validateur E : les formes qui passent les règles, réécrites SANS `any` ni
    // `eval`, pour qu'elles passent aussi le lint du produit (no-explicit-any).
    const TS = 'page.component.ts';
    const NAV = 'interface Nav {\n    navigate(url: string): unknown;\n}\n';
    return [
        [
            'V-ts-declare-location-assign',
            TS,
            "\ndeclare let location: Location;\nexport function nav1(): void {\n    location.assign('//exemple.invalid/');\n}\n",
        ],
        [
            'V-ts-declare-navigation',
            TS,
            `\n${NAV}declare const navigation: Nav;\nexport function nav2(): void {\n    void navigation.navigate('//exemple.invalid/');\n}\n`,
        ],
        [
            'V-ts-event-view-location',
            TS,
            "\nexport function nav3(e: UIEvent): void {\n    const { location: loc } = e.view as Window;\n    loc.assign('//exemple.invalid/');\n}\n",
        ],
        [
            'V-ts-event-view-navigation',
            TS,
            `\n${NAV}export function nav4(e: UIEvent): void {\n    void (e.view as Window & { navigation: Nav }).navigation.navigate('//exemple.invalid/');\n}\n`,
        ],
        [
            'V-ts-destructure-fetch-meme-origine',
            TS,
            "\nexport function api1(e: Event): void {\n    const { ownerDocument } = e.target as Node;\n    const { defaultView } = ownerDocument as Document;\n    const { fetch: send } = defaultView as Window;\n    void send(['/acc', 'ess'].join(''), { method: 'POST' });\n}\n",
        ],
        [
            'V-ts-destructure-cle-calculee-stockage',
            TS,
            "\nexport function store1(e: Event): void {\n    const { ownerDocument } = e.target as Node;\n    const { defaultView } = ownerDocument as Document;\n    const key = ['local', 'Storage'].join('') as Extract<keyof Window, `${'local'}Storage`>;\n    const { [key]: area } = defaultView as Window;\n    area.setItem('k', 'v');\n}\n",
        ],
    ];
})();

// Pages acceptées par les règles et leur mécanisme ; toute autre page est
// refusée (static).
//   csp:<directive> : bloquée par la politique de la coque (mesurée) ;
//   inert           : rien n'est demandé, avec ou sans politique (mesuré
//                     dans Chromium seulement) ; une requête relèverait de
//                     default-src 'self' ;
//   in-app          : fragment de la page ou route de l'application, aucune
//                     autre origine.
export const SECOND_MECHANISMS = Object.freeze({
    'N-html-a-href-fragment': 'in-app',
    'L-html-attribut-xlink-href-svg': 'in-app',
    'N-html-routerLink-relatif': 'in-app',
    'N-html-style-lie-cssText': 'csp:img-src',
    'N-html-style-lie-entier': 'csp:img-src',
    'N-html-style-lie-url': 'csp:img-src',
    'N-scss-border-image': 'csp:img-src',
    'N-scss-cross-fade': 'inert',
    'N-scss-filter-url': 'inert',
    'N-scss-import-layer': 'csp:style-src',
    'N-scss-list-style-image': 'csp:img-src',
    'N-scss-mask-url': 'csp:img-src',
    'N-scss-namespace-url': 'inert',
    'N-scss-URL-majuscules': 'csp:img-src',
    'N-ts-host-style-url': 'csp:img-src',
});

export const SECOND_PROBES = Object.freeze(
    [ROUND_1, ROUND_2, ROUND_3, ROUND_4, ROUND_5].flatMap((round, index) =>
        round.map(([id, file, text, mode, find]) =>
            Object.freeze({
                id,
                file,
                text,
                mode: mode ?? 'append',
                find,
                round: index + 1,
                mechanism: SECOND_MECHANISMS[id] ?? 'static',
            })
        )
    )
);
