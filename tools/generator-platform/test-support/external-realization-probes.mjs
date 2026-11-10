// X4-sécurité : les 77 sondes du validateur (agent E, validation X4 : 3
// témoins et 74 pages interdites), chacune avec le mécanisme qui la bloque.
//   static        : refusée par verify:page-realization avant tout plan ;
//   csp:<directive> : acceptée par les règles (apparence libre), bloquée dans
//                   le navigateur par la politique de la coque, mesurée par
//                   l'événement securitypolicyviolation et zéro requête ;
//   same-origin   : ressource de même origine, hors des fichiers du bundle :
//                   aucune sortie d'origine ; la preuve navigateur de la
//                   réalisation refuse toute requête hors bundle.
// Les textes sont ceux du validateur, à l'octet près.
const TS = 'page.component.ts';
const HTML = 'page.component.html';
const SCSS = 'page.component.scss';

export const VALIDATOR_PROBES = Object.freeze(
    [
        ['C-ts-fetch', TS, "\nvoid fetch('/x');\n", 'static'],
        [
            'C-html-img-https',
            HTML,
            '<img src="https://exemple.invalid/x.png" alt="">\n',
            'static',
        ],
        [
            'C-scss-url-https',
            SCSS,
            '\n.probe{background:url(https://exemple.invalid/x.png);}\n',
            'static',
        ],
        ['T-fetch-direct', TS, "\nvoid fetch('/x');\n", 'static'],
        [
            'T-globalThis-concat',
            TS,
            "\nvoid (globalThis as any)['fe'+'tch']('/x');\n",
            'static',
        ],
        [
            'T-globalThis-bracket-literal',
            TS,
            "\nvoid (globalThis as any)['fetch']('/x');\n",
            'static',
        ],
        [
            'T-window-bracket',
            TS,
            "\nvoid (window as any)['fetch']('/x');\n",
            'static',
        ],
        ['T-fetch-alias', TS, "\nconst f = fetch;\nvoid f('/x');\n", 'static'],
        ['T-fetch-unicode-escape', TS, "\nvoid \\u0066etch('/x');\n", 'static'],
        [
            'T-import-dynamique',
            TS,
            "\nvoid import('./page.component');\n",
            'static',
        ],
        [
            'T-import-dynamique-concat',
            TS,
            "\nvoid import('./page.comp'+'onent');\n",
            'static',
        ],
        ['T-eval', TS, "\nvoid eval('1');\n", 'static'],
        ['T-eval-indirect', TS, "\nvoid (0, eval)('1');\n", 'static'],
        [
            'T-eval-globalThis',
            TS,
            "\nvoid (globalThis as any)['ev'+'al']('1');\n",
            'static',
        ],
        [
            'T-new-Function',
            TS,
            "\nvoid new Function('return 1')();\n",
            'static',
        ],
        [
            'T-Function-sans-new',
            TS,
            "\nvoid Function('return 1')();\n",
            'static',
        ],
        ['T-setTimeout-chaine', TS, "\nsetTimeout('1' as any, 0);\n", 'static'],
        ['T-XMLHttpRequest', TS, '\nvoid new XMLHttpRequest();\n', 'static'],
        [
            'T-XMLHttpRequest-concat',
            TS,
            "\nvoid new (globalThis as any)['XMLHttp'+'Request']();\n",
            'static',
        ],
        [
            'T-WebSocket',
            TS,
            "\nvoid new WebSocket('wss://exemple.invalid');\n",
            'static',
        ],
        [
            'T-WebSocket-concat',
            TS,
            "\nvoid new (globalThis as any)['Web'+'Socket']('/x');\n",
            'static',
        ],
        ['T-sendBeacon', TS, "\nnavigator.sendBeacon('/x');\n", 'static'],
        [
            'T-sendBeacon-concat',
            TS,
            "\n(navigator as any)['send'+'Beacon']('/x');\n",
            'static',
        ],
        ['T-localStorage-direct', TS, '\nvoid localStorage;\n', 'static'],
        [
            'T-localStorage-indirect',
            TS,
            "\nvoid (window as any)['local'+'Storage'];\n",
            'static',
        ],
        [
            'T-localStorage-literal-bracket',
            TS,
            "\nvoid (window as any)['localStorage'];\n",
            'static',
        ],
        [
            'T-cookie-indirect',
            TS,
            "\nvoid (document as any)['coo'+'kie'];\n",
            'static',
        ],
        [
            'T-HttpClient-import',
            TS,
            "import { HttpClient } from '@angular/common/http';\n",
            'static',
            'prepend',
        ],
        [
            'T-HttpClient-inject-sans-import',
            TS,
            '\nvoid inject(HttpClient);\n',
            'static',
        ],
        [
            'T-Image-constructeur',
            TS,
            "\nnew Image().src = '/x.png';\n",
            'static',
        ],
        ['T-Request-constructeur', TS, "\nvoid new Request('/x');\n", 'static'],
        ['T-Worker', TS, "\nvoid new Worker('/w.js');\n", 'static'],
        [
            'T-location-assign-relatif',
            TS,
            "\nlocation.assign('//exemple.invalid/x');\n",
            'static',
        ],
        [
            'T-window-open',
            TS,
            "\nwindow.open('//exemple.invalid/x');\n",
            'static',
        ],
        [
            'T-rxjs-fetch',
            TS,
            "import { fromFetch } from 'rxjs/fetch';\nvoid fromFetch;\n",
            'static',
            'prepend',
        ],
        [
            'T-endpoint-concat',
            TS,
            "\nexport const PATH = '/acc' + 'ess';\n",
            'static',
        ],
        [
            'T-url-concat',
            TS,
            "\nexport const BASE = 'ht' + 'tp://exemple.invalid';\n",
            'static',
        ],
        [
            'H-img-https',
            HTML,
            '<img src="https://exemple.invalid/x.png" alt="">\n',
            'static',
        ],
        [
            'H-img-protocole-relatif',
            HTML,
            '<img src="//exemple.invalid/x.png" alt="">\n',
            'static',
        ],
        ['H-img-chemin-absolu', HTML, '<img src="/x.png" alt="">\n', 'static'],
        ['H-img-relatif', HTML, '<img src="x.png" alt="">\n', 'static'],
        [
            'H-img-srcset',
            HTML,
            '<img srcset="//exemple.invalid/x.png 1x" alt="">\n',
            'static',
        ],
        ['H-img-src-lie', HTML, '<img [src]="source" alt="">\n', 'static'],
        [
            'H-img-attr-src-lie',
            HTML,
            '<img [attr.src]="source" alt="">\n',
            'static',
        ],
        ['H-img-bind-src', HTML, '<img bind-src="source" alt="">\n', 'static'],
        [
            'H-iframe-src',
            HTML,
            '<iframe src="//exemple.invalid/" title="x"></iframe>\n',
            'static',
        ],
        [
            'H-iframe-src-lie',
            HTML,
            '<iframe [src]="source" title="x"></iframe>\n',
            'static',
        ],
        [
            'H-iframe-srcdoc',
            HTML,
            '<iframe srcdoc="<p>x</p>" title="x"></iframe>\n',
            'static',
        ],
        [
            'H-link-href',
            HTML,
            '<link rel="stylesheet" href="//exemple.invalid/x.css">\n',
            'static',
        ],
        [
            'H-link-prefetch-relatif',
            HTML,
            '<link rel="prefetch" href="/x">\n',
            'static',
        ],
        [
            'H-form-action',
            HTML,
            '<form action="/x" method="post"></form>\n',
            'static',
        ],
        [
            'H-form-action-absolu',
            HTML,
            '<form action="https://exemple.invalid/x" method="post"></form>\n',
            'static',
        ],
        [
            'H-form-action-lie',
            HTML,
            '<form [action]="target" method="post"></form>\n',
            'static',
        ],
        [
            'H-button-formaction',
            HTML,
            '<button type="submit" formaction="/x">x</button>\n',
            'static',
        ],
        [
            'H-script-src',
            HTML,
            '<script src="//exemple.invalid/x.js"></script>\n',
            'static',
        ],
        [
            'H-object-data',
            HTML,
            '<object data="//exemple.invalid/x"></object>\n',
            'static',
        ],
        ['H-embed-src', HTML, '<embed src="//exemple.invalid/x">\n', 'static'],
        [
            'H-video-poster',
            HTML,
            '<video poster="//exemple.invalid/x.png"></video>\n',
            'static',
        ],
        [
            'H-audio-src',
            HTML,
            '<audio src="//exemple.invalid/x.mp3"></audio>\n',
            'static',
        ],
        [
            'H-a-ping',
            HTML,
            '<a href="#" ping="//exemple.invalid/p">x</a>\n',
            'static',
        ],
        [
            'H-meta-refresh',
            HTML,
            '<meta http-equiv="refresh" content="0;url=//exemple.invalid/">\n',
            'static',
        ],
        [
            'H-style-attr-url',
            HTML,
            '<div style="background:url(//exemple.invalid/x.png)"></div>\n',
            'csp:img-src',
        ],
        [
            'H-style-lie-url',
            HTML,
            '<div [style.background-image]="bg"></div>\n',
            'csp:img-src',
        ],
        [
            'H-svg-use-href',
            HTML,
            '<svg><use href="//exemple.invalid/s.svg#a"></use></svg>\n',
            'static',
        ],
        [
            'H-ngSrc',
            HTML,
            '<img ngSrc="//exemple.invalid/x.png" width="1" height="1" alt="">\n',
            'static',
        ],
        [
            'S-url-https',
            SCSS,
            '\n.probe{background:url(https://exemple.invalid/x.png);}\n',
            'static',
        ],
        [
            'S-url-protocole-relatif',
            SCSS,
            '\n.probe{background:url(//exemple.invalid/x.png);}\n',
            'csp:img-src',
        ],
        [
            'S-url-chemin-absolu',
            SCSS,
            '\n.probe{background:url(/x.png);}\n',
            'same-origin',
        ],
        [
            'S-url-relatif',
            SCSS,
            '\n.probe{background:url(x.png);}\n',
            'same-origin',
        ],
        [
            'S-url-guillemets',
            SCSS,
            '\n.probe{background:url("//exemple.invalid/x.png");}\n',
            'csp:img-src',
        ],
        [
            'S-import-url',
            SCSS,
            '\n@import url(//exemple.invalid/x.css);\n',
            'csp:style-src',
        ],
        [
            'S-import-chaine',
            SCSS,
            "\n@import '//exemple.invalid/x.css';\n",
            'csp:style-src',
        ],
        [
            'S-font-face',
            SCSS,
            '\n@font-face{font-family:p;src:url(//exemple.invalid/f.woff2);}\n',
            'csp:font-src',
        ],
        [
            'S-image-set',
            SCSS,
            '\n.probe{background:image-set("//exemple.invalid/x.png" 1x);}\n',
            'csp:img-src',
        ],
        [
            'S-content-url',
            SCSS,
            '\n.probe::before{content:url(//exemple.invalid/x.png);}\n',
            'csp:img-src',
        ],
        [
            'S-cursor-url',
            SCSS,
            '\n.probe{cursor:url(//exemple.invalid/c.cur),auto;}\n',
            'csp:img-src',
        ],
        [
            'S-url-echappement',
            SCSS,
            '\n.probe{background:\\75rl(//exemple.invalid/x.png);}\n',
            'csp:img-src',
        ],
    ].map(([id, file, text, mechanism, mode]) =>
        Object.freeze({ id, file, text, mechanism, mode: mode ?? 'append' })
    )
);

// Fichiers d'une page de référence dont un seul fichier porte la sonde.
export function probedFiles(files, probe) {
    const original = files[probe.file];
    return {
        ...files,
        [probe.file]:
            probe.mode === 'prepend'
                ? probe.text + original
                : original + probe.text,
    };
}

// Forme mesurable dans le navigateur d'une sonde acceptée par les règles : la
// même règle appliquée à un élément affiché (le sélecteur `.probe` du
// validateur ne vise aucun élément de la page), l'hôte fictif remplacé par une
// seconde origine locale et le chemin par l'identifiant de la sonde.
export function measurableProbe(probe, foreignOrigin) {
    const target = (text) =>
        text
            .replaceAll(
                '//exemple.invalid/',
                `${foreignOrigin.replace(/^https?:/, '')}/${probe.id}/`
            )
            .replace('url(/x.png)', `url(/${probe.id}.png)`)
            .replace('url(x.png)', `url(${probe.id}.png)`);
    if (probe.file === SCSS) {
        const css = target(probe.text)
            .replaceAll('.probe::before', `#${probe.id}::before`)
            .replaceAll('.probe', `#${probe.id}`)
            .replace(
                'font-family:p;',
                `font-family:${probe.id.replaceAll('-', '')};`
            );
        const usesFont = probe.id === 'S-font-face';
        return {
            css,
            html: `<div id="${probe.id}"${usesFont ? ` style="font-family:${probe.id.replaceAll('-', '')}"` : ''}>${probe.id}</div>`,
        };
    }
    if (probe.id === 'H-style-attr-url')
        return {
            css: '',
            html: target(probe.text).replace('<div ', `<div id="${probe.id}" `),
        };
    // `[style.background-image]` passe par le CSSOM : même effet qu'Angular.
    return {
        css: '',
        html: `<div id="${probe.id}"></div>`,
        script: `document.getElementById(${JSON.stringify(probe.id)}).style.backgroundImage = 'url(${foreignOrigin}/${probe.id}/x.png)';`,
    };
}
